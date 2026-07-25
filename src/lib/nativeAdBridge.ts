/**
 * Native Ad Bridge — abstraction over the wrapping native shell.
 *
 * The app is migrating from Despia to WebViewGold because Despia's AdMob
 * plumbing produced 100% match rate but 0 impressions. WebViewGold exposes
 * a well-documented `admob://` URL-scheme bridge for interstitial and banner
 * ads. We detect the active shell via UserAgent and dispatch the correct
 * scheme. Despia is kept as a fallback so existing installs keep working
 * until they update.
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

export function bridgeShowInterstitial() {
  const shell = detectShell();
  if (shell === 'webviewgold') {
    // WebViewGold AdMob interstitial trigger
    fireBridge('admob://www.webviewgold.com/interstitial');
  } else {
    // Legacy Despia scheme
    fireBridge('displayinterstitialad://');
  }
}

export function bridgePreloadInterstitial() {
  const shell = detectShell();
  if (shell === 'webviewgold') {
    // WebViewGold auto-preloads; a no-op ping keeps the SDK warm.
    fireBridge('admob://www.webviewgold.com/preload');
  } else {
    fireBridge('preloadinterstitialad://');
  }
}

export function bridgeInitAdMob() {
  const shell = detectShell();
  if (shell === 'webviewgold') {
    fireBridge('admob://www.webviewgold.com/initialize');
  } else {
    fireBridge('admob_initialize://');
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
