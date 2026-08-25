import { adLog } from './despiaAds';
import { bridgeInitAdMob, bridgeShowInterstitial, detectShell, isNativeShell } from './nativeAdBridge';

/**
 * ────────────────────────────────────────────────────────────────────────────
 *  BizTrack Interstitial Ad Manager — WebViewGold on-demand bridge (v5)
 * ────────────────────────────────────────────────────────────────────────────
 *
 *  ROOT CAUSE of the "100% match rate, 0 impressions" failure:
 *  WebViewGold presents interstitials natively after every SHOW_AD_AFTER_X
 *  "website interactions" — but that counter only increments on REAL page
 *  loads. BizTrack is a single-page app: React Router changes never reload
 *  the WebView, so the native counter never reaches X and the interstitial
 *  is never presented (while banners and app-open ads, which have no such
 *  counter, work fine). No value of SHOW_AD_AFTER_X can fix an SPA.
 *
 *  THE FIX (two parts):
 *   1. WEB (this file): fires the custom bridge scheme `showinterstitial://`
 *      at every natural transition point (receipt closure after a sale or
 *      service, order completion, …) and `preloadinterstitial://` at startup
 *      and after each show, so the creative is always loaded silently in the
 *      background and never pops up abruptly (AdMob policy).
 *   2. NATIVE (one-time, ~30 lines, Android Studio): paste the handler
 *      snippet from docs/WEBVIEWGOLD_INTERSTITIAL.md into
 *      MainActivity.shouldOverrideUrlLoading, then REBUILD the app.
 *      Until that snippet is compiled in, the web app never fires the custom
 *      schemes at all (they are gated behind the native support flag in
 *      nativeAdBridge) — the app can never be killed by an unhandled scheme,
 *      and interstitials switch on automatically with the new native build.
 *
 *  POLICY SAFETY: the ad is only ever requested AFTER a completed user task
 *  (dialog fully closed + 600ms), with a 60s anti-double-fire guard and a
 *  30-minute cap on plain navigation triggers.
 * ────────────────────────────────────────────────────────────────────────────
 */

const LAST_FIRE_KEY = 'bm:interstitial:lastFire';
const SUPPRESS_KEY = 'bm:interstitial:suppress';

/** Minimum time between any two interstitial requests (anti double-fire). */
const MIN_GAP_MS = 60 * 1000;
/** Screen-change (navigation) triggers stay conservative for policy safety. */
const NAV_GAP_MS = 30 * 60 * 1000;
/** Delay so the receipt dialog finishes closing before the ad appears. */
const SHOW_DELAY_MS = 600;

/* ----------------------------- storage helpers ---------------------------- */
function readNumber(key: string): number {
  try { const r = localStorage.getItem(key); return r ? Number(r) || 0 : 0; } catch { return 0; }
}
function writeNumber(key: string, value: number) {
  try { localStorage.setItem(key, String(value)); } catch {}
}
function clearKey(key: string) { try { localStorage.removeItem(key); } catch {} }

/* ------------------------------ suppression ------------------------------- */
/** One-shot suppression (e.g. a flow that closes two dialogs back-to-back). */
export function suppressNextInterstitial() { writeNumber(SUPPRESS_KEY, 1); }
function consumeSuppression(): boolean {
  if (readNumber(SUPPRESS_KEY)) { clearKey(SUPPRESS_KEY); return true; }
  return false;
}

/* ------------------------------ initialization ---------------------------- */

let initialized = false;

/**
 * Initialize interstitial ads once at app startup. Idempotent.
 * Verifies the native shell, fires the documented `enableads://` command and
 * warms the first interstitial via `preloadinterstitial://` so the creative
 * is loaded silently in the background long before it is needed.
 * Exposes a manual QA hook: `window.WebViewGold.showInterstitial()`.
 */
export function initInterstitialAds() {
  if (initialized) return;
  initialized = true;

  const shell = detectShell();
  if (shell === 'none') {
    adLog('[AD-INTERSTITIAL] Init skipped — web browser (no native shell).');
    return;
  }

  adLog(`[AD-INTERSTITIAL] Init OK — shell=${shell}. Firing enableads:// + preloadinterstitial:// …`);
  bridgeInitAdMob();

  // Manual QA hook — call `WebViewGold.showInterstitial()` from any console.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.WebViewGold = w.WebViewGold || {};
    w.WebViewGold.showInterstitial = (reason = 'manual') => showNow(`manual:${reason}`);
  } catch {}
}

/* --------------------------------- showing -------------------------------- */

function showNow(reason: string) {
  if (!isNativeShell()) {
    adLog(`[AD-INTERSTITIAL] Skipped (web browser). reason=${reason}`);
    return;
  }
  // Record before the transition so concurrent events cannot double-fire.
  writeNumber(LAST_FIRE_KEY, Date.now());
  setTimeout(() => bridgeShowInterstitial(reason), SHOW_DELAY_MS);
  // eslint-disable-next-line no-console
  console.log(`[AD-INTERSTITIAL] showinterstitial:// fires in ${SHOW_DELAY_MS}ms. reason=${reason}`);
}

/* ----------------------------- public triggers ---------------------------- */

/**
 * Trigger A — task-completion point. Called EVERY time a receipt is closed
 * after a sale/service is recorded, plus the other wired completion points.
 * Each call is a genuine natural break; a 60s anti-double-fire guard applies.
 */
export function triggerInterstitial(reason: string) {
  if (typeof window === 'undefined') return;
  if (!isNativeShell()) return;
  if (consumeSuppression()) {
    adLog(`[AD-INTERSTITIAL] Suppressed (one-shot). reason=${reason}`);
    return;
  }
  const since = Date.now() - readNumber(LAST_FIRE_KEY);
  if (readNumber(LAST_FIRE_KEY) && since < MIN_GAP_MS) {
    adLog(`[AD-INTERSTITIAL] Skipped — shown ${Math.round(since / 1000)}s ago (60s guard). reason=${reason}`);
    return;
  }
  showNow(`A:${reason}`);
}

/**
 * Trigger B — screen navigation completed. Conservative 30-minute gap so the
 * app never feels ad-heavy between ordinary page changes (AdMob policy).
 */
export function triggerInterstitialOnScreenChange(reason: string) {
  if (typeof window === 'undefined') return;
  if (!isNativeShell()) return;
  if (consumeSuppression()) return;
  const since = Date.now() - readNumber(LAST_FIRE_KEY);
  if (readNumber(LAST_FIRE_KEY) && since < NAV_GAP_MS) {
    adLog(`[AD-INTERSTITIAL] Nav trigger skipped — last ad ${Math.round(since / 60000)}min ago. reason=${reason}`);
    return;
  }
  showNow(`B:${reason}`);
}

/** @deprecated Kept for backwards compatibility — no-op. */
export function maybeShowInterstitial(_reason = 'navigation') { /* no-op */ }
