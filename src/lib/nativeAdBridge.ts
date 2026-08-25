/**
 * Native Ad Bridge — WebViewGold (the wrapper this app ships with).
 *
 * ONLY officially documented WebViewGold commands are used here
 * (WebViewGold Docs → Android → AdMob Ads API):
 *  - `enableads://`          — re-enable ads for the current user
 *  - `disableads://`         — permanently disable ads for the current user
 *  - `displayrewardedad://`  — show a rewarded ad (requires ENABLE_REWARDED_ADS)
 *
 * Banner and interstitial ads have NO documented on-demand web trigger in
 * WebViewGold. They are configured natively in Config.java / Cloud Builder:
 *  - SHOW_BANNER_AD      = true   → persistent native banner
 *  - SHOW_FULL_SCREEN_AD = true   → interstitials
 *  - SHOW_AD_AFTER_X     = <n>    → interstitial shows after every X website
 *                                   interactions, preloaded silently in the
 *                                   background by the native AdMob SDK.
 *
 * Previously invented schemes (`admob://www.webviewgold.com/showbanner`,
 * `admob_initialize://`, `admob://interstitial`) are NOT understood by
 * WebViewGold — they were silently ignored and caused the "100% match rate,
 * 0 impressions" failure. They have been permanently removed.
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

/** Fire a documented URL-scheme bridge command via the most reliable channels. */
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

/* ------------------------- Documented commands --------------------------- */

/**
 * Init hook — fires the documented `enableads://` command so ads are active
 * for the current user (defensive: a previous `disableads://` or an ad-free
 * in-app purchase flag could otherwise suppress every format).
 */
export function bridgeInitAdMob() {
  const shell = detectShell();
  if (shell === 'none') return;
  fireBridge('enableads://');
}

/** Documented rewarded-ad command (requires ENABLE_REWARDED_ADS = true). */
export function bridgeShowRewardedAd() {
  const shell = detectShell();
  if (shell === 'none') return;
  fireBridge('displayrewardedad://');
}

/* ------------------------------ Interstitial ------------------------------ */

/**
 * WebViewGold has NO documented on-demand interstitial trigger. Interstitials
 * are presented natively after every SHOW_AD_AFTER_X website interactions and
 * are preloaded silently in the background by the native AdMob SDK — so the
 * ad appears smoothly at natural transition points (receipt closure, page
 * navigation) without any web-side show command.
 *
 * This function therefore only logs the transition point. Make sure
 * SHOW_FULL_SCREEN_AD = true and a sensible SHOW_AD_AFTER_X value are set in
 * Config.java / Cloud Builder, and that the app has been REBUILT with those
 * settings — otherwise no web code can make the interstitial appear.
 */
export function bridgeShowInterstitial(reason = 'unspecified') {
  const shell = detectShell();
  if (shell === 'none') return;
  // eslint-disable-next-line no-console
  console.log(
    `[AD-INTERSTITIAL] Transition point reached (${reason}). ` +
    `WebViewGold presents interstitials natively by interval (SHOW_AD_AFTER_X) — ` +
    `verify SHOW_FULL_SCREEN_AD=true in the native config.`
  );
}

/**
 * WebViewGold's native AdMob SDK preloads the next interstitial automatically
 * after each show, so no web-side preload exists. Kept as a safe no-op so the
 * language-change re-preload hook in AdMobManager remains harmless.
 */
export function bridgePreloadInterstitial() {
  if (detectShell() === 'none') return;
  // Native SDK handles preloading — nothing to fire.
}

/* --------------------------------- Banner --------------------------------- */

/**
 * WebViewGold renders the banner natively (SHOW_BANNER_AD = true in
 * Config.java / Cloud Builder) as an overlay above the WebView, and the
 * native AdMob SDK auto-refreshes the creative. There is no documented
 * web-side show/hide banner scheme — the previously used
 * `admob://www.webviewgold.com/showbanner` was invented and ignored.
 * These functions are kept as no-ops so the 120s refresh loop in
 * BottomBannerAd stays harmless.
 */
export function bridgeShowBanner() {
  if (detectShell() === 'none') return;
  // Native banner is controlled by SHOW_BANNER_AD — nothing to fire.
}

export function bridgeHideBanner() {
  if (detectShell() === 'none') return;
  // Native banner is controlled by SHOW_BANNER_AD — nothing to fire.
}
