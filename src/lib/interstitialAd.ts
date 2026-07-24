import { adLog } from './despiaAds';
import {
  bridgeShowInterstitial,
  bridgePreloadInterstitial,
  bridgeInitAdMob,
  isNativeShell,
  detectShell,
} from './nativeAdBridge';

// Back-compat alias — the rest of this file was originally written against
// `isDespiaNativeShell`. The migration to WebViewGold makes it a superset
// check ("is there any native shell wrapping the WebView?").
const isDespiaNativeShell = isNativeShell;

/**
 * Despia Interstitial Ad Manager — dual-trigger logic with dedicated
 * `triggerNativeAd()` invoker.
 *
 * Lifecycle:
 *   - Pre-load on Startup:  `loadInterstitial()` runs as soon as the app mounts
 *     (via `initInterstitialAds`) so an ad is ready before the first trigger.
 *   - Trigger on Action:    `triggerNativeAd()` is called from natural transition
 *     points (closing a receipt dialog, screen navigation completion).
 *   - Validation Check:     a `interstitialAd != null` style guard ensures we
 *     don't fire `displayinterstitialad://` when nothing is preloaded.
 *   - Post-Show Reload:     immediately call `loadInterstitial()` again after
 *     the ad is shown / dismissed so the next ad is ready.
 *   - Debug Logs:           onAdLoaded / onAdFailedToLoad / onAdDismissed are
 *     all logged with `[AD-INTERSTITIAL]` prefixes for AdMob lifecycle tracing.
 *
 * Caps (persisted in localStorage so they survive restarts):
 *   - At most 2 interstitials per 90 minutes
 *   - At least 35 minutes between any two ads
 *   - Trigger B (screen change) additionally requires 45+ min since last ad
 */

const LAST_AD_KEY = 'lastAdTime';
const SHOWN_TIMES_KEY = 'adShownTimes';
const SUPPRESS_KEY = 'suppressNextInterstitial';

const WINDOW_MS = 90 * 60 * 1000;
const MAX_PER_WINDOW = 2;
const MIN_GAP_MS = 35 * 60 * 1000;
const SCREEN_CHANGE_GAP_MS = 45 * 60 * 1000;

// 450ms delay before firing the ad bridge so the UI finishes its current
// transition (dialog close animation, route change paint) before AdMob takes
// over the screen. Despia recommends letting the WebView settle first.
const DISPLAY_DELAY_MS = 450;

/* ----------------------------- storage helpers ---------------------------- */
function readNumber(key: string): number {
  try { const r = localStorage.getItem(key); return r ? Number(r) || 0 : 0; } catch { return 0; }
}
function writeNumber(key: string, value: number) {
  try { localStorage.setItem(key, String(value)); } catch {}
}
function clearKey(key: string) { try { localStorage.removeItem(key); } catch {} }

function readShownTimes(): number[] {
  try {
    const raw = localStorage.getItem(SHOWN_TIMES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((n) => typeof n === 'number') : [];
  } catch { return []; }
}
function writeShownTimes(times: number[]) {
  try { localStorage.setItem(SHOWN_TIMES_KEY, JSON.stringify(times)); } catch {}
}
function pruneAndRecordShown(now: number) {
  const kept = readShownTimes().filter((t) => now - t < WINDOW_MS);
  kept.push(now);
  writeShownTimes(kept);
  writeNumber(LAST_AD_KEY, now);
}

/* ------------------------------ suppression ------------------------------- */
export function suppressNextInterstitial() { writeNumber(SUPPRESS_KEY, 1); }
function consumeSuppression(): boolean {
  if (readNumber(SUPPRESS_KEY)) { clearKey(SUPPRESS_KEY); return true; }
  return false;
}

/* --------------------------- ad-loaded tracking --------------------------- */
// Tracks whether AdMob has reported a preloaded interstitial ready to show.
// This is the equivalent of the `interstitialAd != null` guard used by the
// AdMob native SDK pattern.
let interstitialAd: { ready: true } | null = null;

/* ---------------------------- bridge invocation --------------------------- */

/**
 * Fire a Despia bridge URL. The Despia native shell intercepts navigations to
 * custom `xxx://` schemes. We try MULTIPLE invocation channels because the
 * WebView will honor whichever it happens to hook — the global `despia()`
 * function (when injected), a hidden iframe navigation (most reliable across
 * Despia builds, especially from timers/dialog callbacks), and finally a
 * top-level `location.assign` as last resort. Firing more than one is safe;
 * the shell dedupes on the scheme.
 */
function fireDespia(cmd: string) {
  if (typeof window === 'undefined') return;
  let delivered = false;

  // 1) Global despia(...) function, if the native shell injected it.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const fn = (typeof w.despia === 'function' ? w.despia : undefined) as
      | ((c: string) => void)
      | undefined;
    if (fn) { fn(cmd); delivered = true; }
  } catch (e) {
    adLog(`[AD-INTERSTITIAL] despia() call failed (${cmd}): ${(e as Error)?.message ?? e}`);
  }

  // 2) Hidden iframe navigation — the canonical Despia trigger pattern. This
  //    works even when top-level `location.assign` is blocked by the SPA
  //    router or React re-renders steal focus.
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

  // 3) Last-resort top-level assign.
  if (!delivered) {
    try { window.location.assign(cmd); } catch (e) {
      adLog(`[AD-INTERSTITIAL] location.assign failed (${cmd}): ${(e as Error)?.message ?? e}`);
    }
  }
}

/**
 * Dedicated invoker for the Despia interstitial bridge. Every call site funnels
 * through here so logs stay consistent.
 */
export function triggerNativeAd(reason = 'unspecified') {
  console.log(`[AD-INTERSTITIAL] Attempting to trigger interstitial (${detectShell()}). reason=${reason}`);
  bridgeShowInterstitial();
}

/** Preload the next interstitial. Equivalent to `InterstitialAd.load()`. */
export function loadInterstitial() {
  if (!isDespiaNativeShell()) return;
  console.log('[AD-INTERSTITIAL] load() requested.');
  bridgePreloadInterstitial();
}

/**
 * Initialize the AdMob SDK and preload the first interstitial. Idempotent.
 */
let initialized = false;
export function initInterstitialAds() {
  if (initialized) return;
  initialized = true;
  if (!isDespiaNativeShell()) {
    adLog('[AD-INTERSTITIAL] Init skipped (not in Despia shell).');
    return;
  }

  // Wire up Despia / AdMob lifecycle callbacks if exposed by the shell.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.onDespiaInterstitialLoaded = () => {
      interstitialAd = { ready: true };
      console.log('[AD-INTERSTITIAL] onAdLoaded');
    };
    w.onDespiaInterstitialFailed = (err?: unknown) => {
      interstitialAd = null;
      console.log(`[AD-INTERSTITIAL] onAdFailedToLoad(${err ?? 'unknown'})`);
      setTimeout(loadInterstitial, 5000);
    };
    w.onDespiaInterstitialDismissed = () => {
      interstitialAd = null;
      console.log('[AD-INTERSTITIAL] onAdDismissedFullScreenContent');
      // Post-Show Reload: queue the next ad immediately.
      loadInterstitial();
    };
  } catch {}

  fireDespia('admob_initialize://');
  loadInterstitial();
  // Optimistic readiness flag — Despia doesn't reliably surface `onAdLoaded`,
  // and per the Despia AdMob doc the native wrapper holds the preloaded ad
  // in memory until we fire `displayinterstitialad://`. Without this flag we
  // would gate ourselves out and produce the "100% match, 0 impressions"
  // symptom. Mark ready shortly after init.
  setTimeout(() => { if (!interstitialAd) interstitialAd = { ready: true }; }, 1500);

  // Expose a Despia-friendly alias so any legacy code / manual QA can call
  // `window.Despia.showInterstitial()` from the console to force a trigger.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Despia = (window as any).Despia || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Despia.showInterstitial = (reason = 'manual') => triggerNativeAd(reason);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Despia.loadInterstitial = () => loadInterstitial();
  } catch {}
}

/* ---------------------------- gating predicate ---------------------------- */
function canShowAd(now: number, minGapMs: number): { ok: boolean; reason?: string } {
  const last = readNumber(LAST_AD_KEY);
  if (last && now - last < minGapMs) {
    return { ok: false, reason: `gap (${Math.round((now - last) / 60000)}min < ${Math.round(minGapMs / 60000)}min)` };
  }
  const shown = readShownTimes().filter((t) => now - t < WINDOW_MS);
  if (shown.length >= MAX_PER_WINDOW) {
    return { ok: false, reason: `cap (${shown.length}/${MAX_PER_WINDOW} in 90min)` };
  }
  return { ok: true };
}

function showWithDelay(reason: string) {
  if (!isDespiaNativeShell()) {
    adLog(`[AD-INTERSTITIAL] Skipped (not in Despia shell). reason=${reason}`);
    return;
  }
  // NOTE: we intentionally do NOT gate on `interstitialAd != null` here.
  // Despia's WebView often never emits `onAdLoaded`, so gating on it would
  // silently suppress every real trigger (the "100% match, 0 impressions"
  // failure mode). We rely on the frequency cap above + Despia's own
  // "no-ad → no-op" behavior instead. If nothing is loaded, also re-request
  // a preload so the next trigger has a fresh ad ready.
  if (!interstitialAd) {
    console.log(`[AD-INTERSTITIAL] No preload confirmation — firing anyway + reloading. reason=${reason}`);
    loadInterstitial();
  }
  const now = Date.now();
  // Record before firing so concurrent triggers can't double-show.
  pruneAndRecordShown(now);
  interstitialAd = null;
  // 450ms delay so the dialog/route transition completes first.
  setTimeout(() => {
    triggerNativeAd(reason);
    // Post-Show Reload: ensure next ad is queued even if onDismissed never fires.
    setTimeout(loadInterstitial, 800);
  }, DISPLAY_DELAY_MS);
  console.log(`[AD-INTERSTITIAL] show() scheduled in ${DISPLAY_DELAY_MS}ms. reason=${reason}`);
}

/* ----------------------------- public triggers ---------------------------- */

/** Trigger A — explicit completion point (e.g. close sales receipt). */
export function triggerInterstitial(reason: string) {
  if (typeof window === 'undefined') return;
  if (consumeSuppression()) {
    adLog(`[AD-INTERSTITIAL] Suppressed (one-shot). reason=${reason}`);
    return;
  }
  const now = Date.now();
  const gate = canShowAd(now, MIN_GAP_MS);
  if (!gate.ok) {
    adLog(`[AD-INTERSTITIAL] Trigger A blocked: ${gate.reason}. reason=${reason}`);
    return;
  }
  showWithDelay(`A:${reason}`);
}

/** Trigger B — screen navigation completed (45-min minimum gap). */
export function triggerInterstitialOnScreenChange(reason: string) {
  if (typeof window === 'undefined') return;
  if (consumeSuppression()) return;
  const now = Date.now();
  const gate = canShowAd(now, Math.max(MIN_GAP_MS, SCREEN_CHANGE_GAP_MS));
  if (!gate.ok) {
    adLog(`[AD-INTERSTITIAL] Trigger B blocked: ${gate.reason}. reason=${reason}`);
    return;
  }
  showWithDelay(`B:${reason}`);
}

/** @deprecated Kept for backwards compatibility — no-op. */
export function maybeShowInterstitial(_reason = 'navigation') { /* no-op */ }
