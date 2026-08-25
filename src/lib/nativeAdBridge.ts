/**
 * Native Ad Bridge — abstraction over the wrapping native shell.
 *
 * Only DOCUMENTED shell commands are used here:
 *  - Despia interstitial: `admob://interstitial` (Despia Docs → AdMob →
 *    Interstitial Ads). Legacy beta scheme `displayinterstitialad://` is kept
 *    as a fallback for very old builds.
 *  - WebViewGold ads are configured natively (banner, app open, interstitial
 *    interval) in Config.java / Cloud Builder; the only documented web-side
 *    commands are `enableads://` / `disableads://` and `displayrewardedad://`.
 *
 * Previously invented schemes (`admob://www.webviewgold.com/...`,
 * `admob_initialize://`) were silently ignored by the shells and caused the
 * "100% match rate, 0 impressions" failure. They have been removed.
 */

export const BANNER_HEIGHT_PX = 60; // reserved space in the web layout

export type NativeShell = 'webviewgold' | 'despia' | 'none';

export function detectShell(): NativeShell {
  if (typeof window === 'undefined') return 'none';
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes('webviewgold') || ua.includes('wvg')) return 'webviewgold';
  if (ua.includes('despia') || ua.includes('biztrack') || ua.includes('com.despia.biztrack')) return 'despia';
  // Heuristic: WebViewGold builds often ship without the marker but expose
  // `window.webkit.messageHandlers` or `window.Android.webviewgold`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w?.Android?.webviewgold || w?.webkit?.messageHandlers?.webviewgold) return 'webviewgold';
  if (typeof w?.despia === 'function') return 'despia';
  // Android WebView (Samsung Galaxy, Xiaomi, etc.) — production Play Store
  // builds shipped via WebViewGold/Despia identify as "wv" in the UA even
  // when the wrapper marker is absent. Treat any Android WebView as a native
  // shell so we don't render the web-only ad placeholder alongside the real
  // native AdMob banner.
  if (/\bwv\b/.test(ua) && /android/.test(ua)) return 'webviewgold';
  return 'none';
}

export function isNativeShell(): boolean {
  return detectShell() !== 'none';
}

/**
 * Resolve the current locale for ad targeting. We combine the app's chosen
 * i18n language (persisted in localStorage under `i18nextLng`) with the
 * device/browser language and region so AdMob / WebViewGold can request
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

/** Fire a URL-scheme bridge command via the most reliable channels. */
export function fireBridge(cmd: string) {
  if (typeof window === 'undefined') return;
  const url = withLocale(cmd);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (typeof w.despia === 'function') { try { w.despia(url); } catch {} }
  } catch {}
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => { try { iframe.remove(); } catch {} }, 1500);
  } catch {}
}

/* ------------------------------ Interstitial ------------------------------ */

/**
 * Show the native interstitial. Uses the documented Despia command
 * `admob://interstitial` (fire-and-forget: the native runtime presents the
 * ad it has already loaded in the background). The legacy beta scheme is
 * fired shortly after as a fallback for very old builds. WebViewGold builds
 * show interstitials natively by interval (SHOW_AD_AFTER_X) — there is no
 * documented on-demand scheme, so nothing fabricated is fired for them.
 */
export function bridgeShowInterstitial() {
  const shell = detectShell();
  if (shell === 'none') return;
  fireBridge('admob://interstitial');
  if (shell === 'despia') {
    setTimeout(() => fireBridge('displayinterstitialad://'), 120);
  }
}

/**
 * Despia's runtime loads interstitials natively in the background, so no web
 * preload is required. This ping keeps very old (beta) builds warm.
 */
export function bridgePreloadInterstitial() {
  const shell = detectShell();
  if (shell === 'despia') fireBridge('preloadinterstitialad://');
}

/**
 * Init hook. The only documented web-side ad command WebViewGold exposes is
 * `enableads://` — fired defensively in case ads were disabled for the user.
 * Despia needs no init call: the Mobile Ads SDK is compiled into the binary.
 */
export function bridgeInitAdMob() {
  const shell = detectShell();
  if (shell === 'webviewgold') {
    fireBridge('enableads://');
  }
}

/* --------------------------------- Banner --------------------------------- */

let bannerShown = false;

export function bridgeShowBanner() {
  const shell = detectShell();
  if (shell === 'none') return;
  if (bannerShown) return;
  bannerShown = true;
  if (shell === 'webviewgold') {
    fireBridge('admob://www.webviewgold.com/showbanner');
  } else {
    // Despia banner scheme (best-effort; Despia's banner support is limited).
    fireBridge('showbannerad://');
  }
}

export function bridgeHideBanner() {
  const shell = detectShell();
  if (shell === 'none') { bannerShown = false; return; }
  if (!bannerShown) return;
  bannerShown = false;
  if (shell === 'webviewgold') {
    fireBridge('admob://www.webviewgold.com/hidebanner');
  } else {
    fireBridge('hidebannerad://');
  }
}
