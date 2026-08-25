/**
 * Native Ad Bridge — WebViewGold (the wrapper this app ships with).
 *
 * Documented WebViewGold commands (WebViewGold Docs → Android → AdMob Ads API):
 *  - `enableads://`          — re-enable ads for the current user
 *  - `disableads://`         — permanently disable ads for the current user
 *  - `displayrewardedad://`  — show a rewarded ad (requires ENABLE_REWARDED_ADS)
 *
 * Custom BizTrack commands (handled by a small snippet pasted into
 * MainActivity.shouldOverrideUrlLoading — see docs/WEBVIEWGOLD_INTERSTITIAL.md):
 *  - `showinterstitial://`     — present the preloaded interstitial NOW
 *  - `preloadinterstitial://`  — silently load the next interstitial in the
 *                                background so it never appears abruptly
 *
 * WHY the custom commands are needed: WebViewGold presents interstitials
 * natively after every SHOW_AD_AFTER_X "website interactions" — but that
 * counter only increments on REAL page loads. BizTrack is a single-page app
 * (React Router changes never reload the WebView), so the counter never
 * reaches X. That is exactly why AdMob reported a 100% match rate (the SDK
 * preloads fine) with 0 impressions (the interval is never hit). The custom
 * scheme restores reliable, policy-compliant interstitials at natural
 * transition points (receipt closed after a sale/service).
 *
 * IMPORTANT — how the bridge fires: Android WebView only intercepts
 * MAIN-FRAME navigations in shouldOverrideUrlLoading. Setting the `src` of a
 * hidden iframe is a SUBFRAME load and never reaches the native handler —
 * that is why earlier iframe-based schemes did nothing. fireBridge therefore
 * uses a top-level navigation; WebViewGold intercepts the scheme and cancels
 * the load, so the SPA never actually navigates or reloads.
 *
 * SAFETY — why custom schemes are gated: a main-frame navigation to a scheme
 * the native build does NOT intercept kills the WebView with
 * net::ERR_UNKNOWN_URL_SCHEME (the app is replaced by an error page and can
 * no longer open). fireBridge therefore only navigates when the shell is
 * positively identified as WebViewGold, and custom schemes
 * (`showinterstitial://` / `preloadinterstitial://`) additionally require the
 * native handlers to have announced themselves (see isCustomBridgeSupported).
 */

export const BANNER_HEIGHT_PX = 60; // reserved space in the web layout

export type NativeShell = 'webviewgold' | 'despia' | 'none';

export function detectShell(): NativeShell {
  if (typeof window === 'undefined') return 'none';
  const ua = window.navigator.userAgent.toLowerCase();
  // WebViewGold markers — the production wrapper for this app.
  if (ua.includes('webviewgold') || ua.includes('wvg') || ua.includes('biztrack')) return 'webviewgold';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w?.Android?.webviewgold || w?.webkit?.messageHandlers?.webviewgold) return 'webviewgold';
  // Any Android WebView build (Play Store binary) is treated as WebViewGold —
  // the wrapper marker can be stripped from the UA on some devices.
  if (/\bwv\b/.test(ua) && /android/.test(ua)) return 'webviewgold';
  // Legacy Despia builds — kept only as a fallback for very old installs.
  if (ua.includes('despia') || ua.includes('com.despia.biztrack')) return 'despia';
  if (typeof w?.despia === 'function') return 'despia';
  return 'none';
}

export function isNativeShell(): boolean {
  return detectShell() !== 'none';
}

/**
 * Resolve the current locale for ad targeting. We combine the app's chosen
 * i18n language (persisted in localStorage under `i18nextLng`) with the
 * device/browser language and region so the native shell can request
 * creatives in the user's native language and country.
 */
export function getAdLocale(): { language: string; region: string; locale: string } {
  if (typeof window === 'undefined') return { language: 'en', region: 'US', locale: 'en-US' };
  let lang = '';
  try { lang = window.localStorage.getItem('i18nextLng') || ''; } catch {}
  if (!lang) lang = window.navigator?.language || 'en';
  const nav = window.navigator?.language || 'en-US';
  const language = (lang.split('-')[0] || 'en').toLowerCase();
  const region = ((nav.split('-')[1] || lang.split('-')[1] || 'US')).toUpperCase();
  return { language, region, locale: `${language}-${region}` };
}

/** Append locale query params to a bridge URL so the native shell can localize ads. */
function withLocale(cmd: string): string {
  const { language, region, locale } = getAdLocale();
  const sep = cmd.includes('?') ? '&' : '?';
  return `${cmd}${sep}lang=${encodeURIComponent(language)}&region=${encodeURIComponent(region)}&locale=${encodeURIComponent(locale)}`;
}

/* --------------------------- shell capability ---------------------------- */

const SUPPORT_FLAG_KEY = 'bm:wvg-bridge:supported';

/** Schemes WebViewGold itself handles natively (documented URL-scheme API). */
const DOCUMENTED_SCHEMES = ['enableads://', 'disableads://', 'displayrewardedad://'];

function isDocumentedScheme(cmd: string): boolean {
  return DOCUMENTED_SCHEMES.some((s) => cmd.startsWith(s));
}

/**
 * True only when the wrapper is POSITIVELY identified as WebViewGold
 * (explicit UA marker or an injected native bridge object). The generic
 * "any Android WebView" fallback in detectShell() is deliberately NOT enough
 * to justify a top-level scheme navigation: in an in-app browser (Telegram,
 * Facebook, …) an unhandled scheme would kill the page with
 * net::ERR_UNKNOWN_URL_SCHEME.
 */
export function isWebViewGoldConfirmed(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes('webviewgold') || ua.includes('wvg') || ua.includes('biztrack')) return true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return !!(w?.Android?.webviewgold || w?.webkit?.messageHandlers?.webviewgold);
}

/**
 * True once the native on-demand interstitial handlers
 * (docs/WEBVIEWGOLD_INTERSTITIAL.md) have announced themselves — either live
 * via `window.WebViewGoldInterstitial` (injected by the native snippet) or
 * persisted in localStorage from a previous launch. Until then the custom
 * schemes are NEVER fired: an unhandled custom scheme in the main frame
 * replaces the whole app with an error page.
 */
export function isCustomBridgeSupported(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.WebViewGoldInterstitial === true) {
    try { window.localStorage.setItem(SUPPORT_FLAG_KEY, '1'); } catch {}
    return true;
  }
  try { return window.localStorage.getItem(SUPPORT_FLAG_KEY) === '1'; } catch { return false; }
}

/**
 * Fire a bridge command via the safest available channel.
 * The top-level `window.location.href` assignment is what makes the command
 * actually reach WebViewGold: Android WebView only intercepts main-frame
 * navigations in shouldOverrideUrlLoading, where every WebViewGold URL-scheme
 * API (`qrcode://`, `takescreenshot://`, `enableads://`, …) is handled.
 * WebViewGold cancels the load once it handles the scheme, so the web app
 * itself never navigates away.
 *
 * Guards (in order):
 *  1. No shell → do nothing.
 *  2. Legacy Despia shell → only the JS bridge function, never navigate.
 *  3. Unconfirmed Android WebView (in-app browsers etc.) → never navigate.
 *  4. Custom schemes require the native support flag (see above).
 */
export function fireBridge(cmd: string) {
  if (typeof window === 'undefined') return;
  const url = withLocale(cmd);
  const shell = detectShell();
  if (shell === 'none') return;

  if (shell === 'despia') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (typeof w.despia === 'function') { try { w.despia(url); } catch {} }
    } catch {}
    return;
  }

  if (!isWebViewGoldConfirmed()) return;

  if (!isDocumentedScheme(cmd) && !isCustomBridgeSupported()) {
    // eslint-disable-next-line no-console
    console.log(`[AD-BRIDGE] Skipped ${cmd} — native interstitial handlers not detected yet (see docs/WEBVIEWGOLD_INTERSTITIAL.md).`);
    return;
  }

  try { window.location.href = url; } catch {}
}

/* ------------------------- Documented commands --------------------------- */

/**
 * Init hook — fires the documented `enableads://` command so ads are active
 * for the current user (defensive: a previous `disableads://` or an ad-free
 * in-app purchase flag could otherwise suppress every format). Also warms the
 * first interstitial silently in the background.
 */
export function bridgeInitAdMob() {
  const shell = detectShell();
  if (shell === 'none') return;
  fireBridge('enableads://');
  bridgePreloadInterstitial();
}

/** Documented rewarded-ad command (requires ENABLE_REWARDED_ADS = true). */
export function bridgeShowRewardedAd() {
  const shell = detectShell();
  if (shell === 'none') return;
  fireBridge('displayrewardedad://');
}

/* ------------------------------ Interstitial ------------------------------ */

/**
 * Present the preloaded interstitial NOW via the custom `showinterstitial://`
 * scheme (native handler: docs/WEBVIEWGOLD_INTERSTITIAL.md). The creative is
 * always loaded silently in the background first, so the ad appears smoothly
 * at a natural transition point — never abruptly (AdMob policy). If the
 * native handler is not compiled into the app yet, WebViewGold simply ignores
 * the unknown scheme and nothing breaks.
 */
export function bridgeShowInterstitial(reason = 'unspecified') {
  const shell = detectShell();
  if (shell === 'none') return;
  // eslint-disable-next-line no-console
  console.log(`[AD-INTERSTITIAL] Firing showinterstitial:// (${reason}).`);
  fireBridge(`showinterstitial://?reason=${encodeURIComponent(reason)}`);
}

/**
 * Silently preload the next interstitial in the background so the next
 * `showinterstitial://` is instant and smooth. Fired at app startup, after
 * every interstitial dismissal (native side re-preloads too), and on language
 * change. Throttled to one fire per 20s; the native handler additionally
 * dedupes (it no-ops while an ad is loaded or already loading).
 */
let lastPreloadAt = 0;
export function bridgePreloadInterstitial() {
  if (detectShell() === 'none') return;
  const now = Date.now();
  if (now - lastPreloadAt < 20 * 1000) return;
  lastPreloadAt = now;
  fireBridge('preloadinterstitial://');
}

/* --------------------------------- Banner --------------------------------- */

/**
 * WebViewGold renders the banner natively (SHOW_BANNER_AD = true in
 * Config.java) as an overlay above the WebView, and the native AdMob SDK
 * auto-refreshes the creative. There is no documented web-side show/hide
 * banner scheme. These functions are kept as no-ops so the 120s refresh loop
 * in BottomBannerAd stays harmless.
 */
export function bridgeShowBanner() {
  if (detectShell() === 'none') return;
  // Native banner is controlled by SHOW_BANNER_AD — nothing to fire.
}

export function bridgeHideBanner() {
  if (detectShell() === 'none') return;
  // Native banner is controlled by SHOW_BANNER_AD — nothing to fire.
}
