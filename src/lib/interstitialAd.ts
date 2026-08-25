import { adLog } from './despiaAds';
import { detectShell, isNativeShell } from './nativeAdBridge';

/**
 * ────────────────────────────────────────────────────────────────────────────
 *  BizTrack Interstitial Ad Manager — FRESH IMPLEMENTATION (v3)
 * ────────────────────────────────────────────────────────────────────────────
 *
 *  Root cause of the old "100% match rate, 0 impressions" failure:
 *  the previous build fired invented bridge schemes
 *  (`admob://www.webviewgold.com/interstitial`, `admob_initialize://`)
 *  that no native shell understands. The AdMob SDK loaded the ad (hence the
 *  100% match rate in the AdMob console) but the SHOW command never reached
 *  the native layer, so the ad was never presented.
 *
 *  This rewrite uses ONLY the officially documented Despia command:
 *
 *      despia('admob://interstitial')
 *
 *  (Despia Docs → Native Features → AdMob → Interstitial Ads). The call is
 *  fire-and-forget: the native runtime loads the Ad Unit ID configured in the
 *  Despia Editor and presents the full-screen ad above the WebView. Loading
 *  is handled natively — the ad is already prepared in the background by the
 *  SDK, so the ad appears smoothly (never abruptly) at the transition point.
 *
 *  Lifecycle:
 *    1. STARTUP   — initInterstitialAds() runs once at app mount, verifies the
 *                   native shell and logs diagnostics ([AD-INTERSTITIAL]).
 *    2. TRIGGER   — triggerInterstitial(reason) is called when a receipt is
 *                   closed after a sale/service is recorded, plus the other
 *                   natural completion points already wired in the app.
 *    3. DELAY     — the show command fires 600ms AFTER the dialog has fully
 *                   closed so the ad never interrupts an animation (AdMob
 *                   policy: ads only at natural break points).
 *    4. GUARD     — a 60-second anti-double-fire guard prevents two stacked
 *                   events (e.g. dialog close + export) from firing twice.
 *
 *  Required native-side setup (Despia Editor → App → Integrations → AdMob):
 *    - AdMob integration toggled ON
 *    - Android Interstitial Ad Unit ID pasted (Main_App_receip closure)
 *    - App REBUILT after enabling — otherwise the SDK is not compiled into
 *      the binary and the call resolves silently (0 impressions).
 * ────────────────────────────────────────────────────────────────────────────
 */

const LAST_FIRE_KEY = 'bm:interstitial:lastFire';
const SUPPRESS_KEY = 'bm:interstitial:suppress';

/** Minimum time between any two interstitial shows (anti double-fire). */
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

/* ---------------------------- bridge invocation --------------------------- */

/**
 * Fire the documented Despia interstitial command through every delivery
 * channel the shell may hook. Firing more than one is safe — the native
 * runtime dedupes on the scheme and presents the ad once.
 *
 * Channels:
 *   1. Global `despia()` function (injected by the Despia runtime / the
 *      `despia-native` package when present).
 *   2. Hidden iframe navigation to the scheme (most reliable from inside
 *      setTimeout / dialog-close callbacks).
 *   3. Top-level `location.assign` as the last resort.
 */
function fireScheme(cmd: string) {
  if (typeof window === 'undefined') return;
  let delivered = false;

  // 1) Global despia(...) function — the documented call path.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (typeof w.despia === 'function') {
      w.despia(cmd);
      delivered = true;
    }
  } catch (e) {
    adLog(`[AD-INTERSTITIAL] despia() call failed (${cmd}): ${(e as Error)?.message ?? e}`);
  }

  // 2) Hidden iframe navigation — intercepted by the native shell.
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.src = cmd;
    document.body.appendChild(iframe);
    setTimeout(() => { try { iframe.remove(); } catch {} }, 1500);
    delivered = true;
  } catch (e) {
    adLog(`[AD-INTERSTITIAL] iframe bridge failed (${cmd}): ${(e as Error)?.message ?? e}`);
  }

  // 3) Last-resort top-level navigation.
  if (!delivered) {
    try { window.location.assign(cmd); } catch (e) {
      adLog(`[AD-INTERSTITIAL] location.assign failed (${cmd}): ${(e as Error)?.message ?? e}`);
    }
  }
}

/** The one canonical command — documented in the Despia AdMob guide. */
const DESPIA_INTERSTITIAL_CMD = 'admob://interstitial';
/** Legacy beta scheme kept ONLY as a fallback for very old builds. */
const LEGACY_INTERSTITIAL_CMD = 'displayinterstitialad://';

/**
 * Present the interstitial now. Equivalent to `interstitialAd.show()`.
 * The native runtime shows the ad it has loaded in the background; if no ad
 * is ready the call is a safe native-side no-op.
 */
export function triggerNativeAd(reason = 'unspecified') {
  const shell = detectShell();
  console.log(`[AD-INTERSTITIAL] show() → shell=${shell} reason=${reason}`);
  // Documented command first, legacy fallback second.
  fireScheme(DESPIA_INTERSTITIAL_CMD);
  // Small delay so the shell processes the primary command first.
  setTimeout(() => fireScheme(LEGACY_INTERSTITIAL_CMD), 120);
}

/**
 * Background warmup. Despia's runtime loads the interstitial natively and
 * keeps it ready, so there is nothing to fetch from the web side — this ping
 * simply nudges the legacy preload scheme on old builds and logs readiness.
 */
export function loadInterstitial() {
  if (!isNativeShell()) return;
  console.log('[AD-INTERSTITIAL] Background load handled natively (fire-and-forget SDK).');
  try { fireScheme('preloadinterstitialad://'); } catch {}
}

/* ------------------------------ initialization ---------------------------- */

let initialized = false;

/**
 * Initialize interstitial ads once at app startup. Idempotent.
 * Verifies the native shell, wires optional lifecycle callbacks the shell may
 * expose, and exposes a manual QA hook: `window.Despia.showInterstitial()`.
 */
export function initInterstitialAds() {
  if (initialized) return;
  initialized = true;

  const shell = detectShell();
  if (shell === 'none') {
    adLog('[AD-INTERSTITIAL] Init skipped — web browser (no native shell).');
    return;
  }

  adLog(`[AD-INTERSTITIAL] Init OK — shell=${shell}. Command: despia('${DESPIA_INTERSTITIAL_CMD}')`);

  // Optional lifecycle callbacks (fired by shells that support them).
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.onDespiaInterstitialLoaded = () => console.log('[AD-INTERSTITIAL] onAdLoaded');
    w.onDespiaInterstitialFailed = (err?: unknown) =>
      console.log(`[AD-INTERSTITIAL] onAdFailedToLoad(${err ?? 'unknown'})`);
    w.onDespiaInterstitialDismissed = () => console.log('[AD-INTERSTITIAL] onAdDismissedFullScreenContent');
  } catch {}

  // Manual QA hook — call `Despia.showInterstitial()` from any console.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.Despia = w.Despia || {};
    w.Despia.showInterstitial = (reason = 'manual') => showNow(`manual:${reason}`);
    w.Despia.loadInterstitial = () => loadInterstitial();
  } catch {}
}

/* --------------------------------- showing -------------------------------- */

function showNow(reason: string) {
  if (!isNativeShell()) {
    adLog(`[AD-INTERSTITIAL] Skipped (web browser). reason=${reason}`);
    return;
  }
  // Record before firing so concurrent events cannot double-show.
  writeNumber(LAST_FIRE_KEY, Date.now());
  setTimeout(() => triggerNativeAd(reason), SHOW_DELAY_MS);
  console.log(`[AD-INTERSTITIAL] show() scheduled in ${SHOW_DELAY_MS}ms (after transition). reason=${reason}`);
}

/* ----------------------------- public triggers ---------------------------- */

/**
 * Trigger A — task-completion point. Fires EVERY time a receipt is closed
 * after a sale/service is recorded (per current testing policy), plus the
 * other wired completion points. Only a 60s anti-double-fire guard applies.
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
    adLog(`[AD-INTERSTITIAL] Skipped — ad fired ${Math.round(since / 1000)}s ago (60s guard). reason=${reason}`);
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
