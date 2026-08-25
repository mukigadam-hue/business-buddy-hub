/* -------------------------------------------------------------------------- */
/* WebViewGold / AdMob constants                                              */
/* -------------------------------------------------------------------------- */
/**
 * The production app is wrapped with WebViewGold (package com.despia.biztrack).
 * WebViewGold natively supports Banner ads, Interstitial ads (interval-based,
 * preloaded silently by the native SDK), Rewarded ads and App Open ads —
 * all configured in Config.java / the WebViewGold Cloud Builder.
 *
 * Inline AdSense slots are used on the web (browser/PWA) only. We keep
 * `app-ads.txt` reachable at the developer domain so the AdMob app remains
 * verified.
 */

export const ADMOB_APP_ID = 'ca-app-pub-9605564713228252~8941826330';
export const ADMOB_INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-9605564713228252/9382423774';
export const APP_ADS_DOMAIN = 'https://ndamwesigaapp.store';

export function adLog(message: string) {
  // eslint-disable-next-line no-console
  console.log(message);
}

/**
 * True when running inside the native WebViewGold wrapper (or any legacy
 * native shell). Kept under its historical name for import compatibility —
 * detection itself is WebViewGold-first (see nativeAdBridge.detectShell).
 */
export function isDespiaNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes('webviewgold') || ua.includes('wvg') || ua.includes('biztrack')) return true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w?.Android?.webviewgold || w?.webkit?.messageHandlers?.webviewgold) return true;
  if (/\bwv\b/.test(ua) && /android/.test(ua)) return true;
  // Legacy Despia builds.
  if (ua.includes('despia') || ua.includes('com.despia.biztrack')) return true;
  if (typeof w?.despia === 'function') return true;
  return false;
}
