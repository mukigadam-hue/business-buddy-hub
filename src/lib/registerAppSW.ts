// Guarded service worker registration for offline app-shell support.
// This wrapper is the ONLY registrar for /sw.js (vite.config sets
// injectRegister: null so the PWA plugin never registers on its own).

const SW_URL = '/sw.js';

function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true; // inside an iframe
  } catch {
    return true;
  }
  const host = window.location.hostname;
  if (host.startsWith('id-preview--') || host.startsWith('preview--')) return true;
  if (host === 'lovableproject.com' || host.endsWith('.lovableproject.com')) return true;
  if (host === 'lovableproject-dev.com' || host.endsWith('.lovableproject-dev.com')) return true;
  if (host === 'beta.lovable.dev' || host.endsWith('.beta.lovable.dev')) return true;
  if (new URLSearchParams(window.location.search).get('sw') === 'off') return true; // kill switch
  return false;
}

async function unregisterAppSWs() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.waiting?.scriptURL || r.installing?.scriptURL || '';
          return url.endsWith(SW_URL);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    // ignore
  }
}

export function registerAppSW() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (isRefusedContext()) {
    // Never run a SW in dev/preview/iframe — clean up any stale registration.
    void unregisterAppSWs();
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(SW_URL).catch(() => {
      // registration failed (e.g. unsupported context) — app still works online
    });
  });
}
