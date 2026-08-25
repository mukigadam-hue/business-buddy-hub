import { adLog } from './despiaAds';
import { bridgeInitAdMob, bridgeShowInterstitial, detectShell, isNativeShell } from './nativeAdBridge';

/**
 * ────────────────────────────────────────────────────────────────────────────
 *  BizTrack Interstitial Ad Manager — WebViewGold implementation (v4)
 * ────────────────────────────────────────────────────────────────────────────
 *
 *  This app is wrapped with WebViewGold (NOT Despia). Verified against the
 *  official WebViewGold for Android documentation (Docs → AdMob Ads API):
 *
 *  FACT 1 — WebViewGold has NO documented on-demand web command to show an
 *           interstitial. The only documented ad URL schemes are:
 *             enableads://, disableads://, displayrewardedad://
 *
 *  FACT 2 — Interstitials are configured natively in Config.java / the
 *           WebViewGold Cloud Builder:
 *             SHOW_FULL_SCREEN_AD = true   → enable interstitials
 *             SHOW_AD_AFTER_X     = <n>    → show after every X website
 *                                            interactions (clicks/loads)
 *           The native AdMob SDK preloads the next interstitial silently in
 *           the background, so the ad appears smoothly — never abruptly — at
 *           natural transition points (exactly what AdMob policy requires).
 *
 *  FACT 3 — The old build's "100% match rate, 0 impressions" came from firing
 *           invented schemes (`admob://www.webviewgold.com/interstitial`,
 *           `admob_initialize://`) that WebViewGold does not implement. AdMob
 *           loaded the ad (match rate) but nothing ever presented it.
 *
 *  What this manager does:
 *    1. STARTUP   — initInterstitialAds() verifies the native shell and fires
 *                   the documented `enableads://` command.
 *    2. TRIGGER   — triggerInterstitial(reason) is called at every receipt
 *                   closure / completion point. Each call is a real user
 *                   interaction that counts toward WebViewGold's
 *                   SHOW_AD_AFTER_X interval; the manager logs the transition
 *                   and keeps an anti-double-fire guard so diagnostics stay
 *                   meaningful. The actual presentation is native.
 *    3. DELAY     — 600ms after the dialog closes, so the transition point is
 *                   a clean natural break (AdMob policy).
 *
 *  REQUIRED native-side setup (WebViewGold Cloud Builder or Config.java):
 *    - SHOW_BANNER_AD      = true   (bottom banner)
 *    - SHOW_FULL_SCREEN_AD = true   (interstitials)
 *    - SHOW_AD_AFTER_X     = 8      (≈ every 8 interactions — tune to taste)
 *    - AdMob App ID + Interstitial + Banner unit IDs in strings.xml
 *    - REBUILD the app after changing these — otherwise the settings are not
 *      compiled into the binary and no interstitial can ever appear.
 * ────────────────────────────────────────────────────────────────────────────
 */

const LAST_FIRE_KEY = 'bm:interstitial:lastFire';
const SUPPRESS_KEY = 'bm:interstitial:suppress';

/** Minimum time between any two interstitial transition logs (anti double-fire). */
const MIN_GAP_MS = 60 * 1000;
/** Screen-change (navigation) triggers stay conservative for policy safety. */
const NAV_GAP_MS = 30 * 60 * 1000;
/** Delay so the receipt dialog finishes closing before the transition point. */
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
 * Verifies the WebViewGold shell, fires the documented `enableads://`
 * command, and exposes a manual QA hook: `window.WebViewGold.showInterstitial()`.
 */
export function initInterstitialAds() {
  if (initialized) return;
  initialized = true;

  const shell = detectShell();
  if (shell === 'none') {
    adLog('[AD-INTERSTITIAL] Init skipped — web browser (no native shell).');
    return;
  }

  adLog(`[AD-INTERSTITIAL] Init OK — shell=${shell} (WebViewGold). Firing enableads:// …`);
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
  // Record before the transition so concurrent events cannot double-log.
  writeNumber(LAST_FIRE_KEY, Date.now());
  setTimeout(() => bridgeShowInterstitial(reason), SHOW_DELAY_MS);
  // eslint-disable-next-line no-console
  console.log(`[AD-INTERSTITIAL] Transition scheduled in ${SHOW_DELAY_MS}ms. reason=${reason}`);
}

/* ----------------------------- public triggers ---------------------------- */

/**
 * Trigger A — task-completion point. Called EVERY time a receipt is closed
 * after a sale/service is recorded, plus the other wired completion points.
 * Each call marks a genuine user interaction at a natural break point;
 * WebViewGold presents the natively-preloaded interstitial according to its
 * SHOW_AD_AFTER_X interval. Only a 60s anti-double-fire guard applies.
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
    adLog(`[AD-INTERSTITIAL] Skipped — transition ${Math.round(since / 1000)}s ago (60s guard). reason=${reason}`);
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
    adLog(`[AD-INTERSTITIAL] Nav trigger skipped — last transition ${Math.round(since / 60000)}min ago. reason=${reason}`);
    return;
  }
  showNow(`B:${reason}`);
}

/** @deprecated Kept for backwards compatibility — no-op. */
export function maybeShowInterstitial(_reason = 'navigation') { /* no-op */ }
