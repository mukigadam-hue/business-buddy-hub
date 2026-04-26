/**
 * Despia native shell screenshot helper.
 *
 * The Despia native wrapper exposes a global `despia()` bridge function.
 * Calling `despia("takescreenshot://")` triggers native screenshot capture
 * and saves the image to the device's gallery.
 *
 * On the web (outside the native shell) this gracefully returns `false` so
 * callers can fall back to a browser-based capture or hide the action.
 */

import '@/types/despia.d.ts';

/** True if running inside the Despia native shell (the bridge function exists). */
export function isDespiaShell(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).despia === 'function';
}

/**
 * Trigger a native screenshot via the Despia bridge.
 * Returns `true` if the native command was dispatched, `false` otherwise.
 */
export function takeNativeScreenshot(): boolean {
  try {
    const fn = (window as any).despia;
    if (typeof fn === 'function') {
      fn('takescreenshot://');
      return true;
    }
    // Some Despia builds expose the bridge only as a top-level global.
    if (typeof (globalThis as any).despia === 'function') {
      (globalThis as any).despia('takescreenshot://');
      return true;
    }
  } catch (err) {
    console.warn('[Despia] screenshot bridge failed:', err);
  }
  return false;
}
