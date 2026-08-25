// Offline-resilient submit helpers.
//
// Problem: inside Android WebView / WebViewGold shells, navigator.onLine often
// reports `true` even when the connection is dead, so Supabase requests hang
// indefinitely and save buttons spin forever. These helpers bound every DB
// write with a timeout and detect network-style failures so callers can fall
// back to the offline queue (IndexedDB) and sync later.

export const OFFLINE_TIMEOUT_MS = 12000;

export class NetworkTimeoutError extends Error {
  constructor() {
    super('Network timeout — connection unavailable');
    this.name = 'NetworkTimeoutError';
  }
}

/** Race a promise/thenable against a hard timeout. */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number = OFFLINE_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new NetworkTimeoutError()), ms);
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/** True when an error looks like a connectivity failure (safe to queue & retry later). */
export function isOfflineError(error: any): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (!error) return false;
  if (error instanceof NetworkTimeoutError || error?.name === 'NetworkTimeoutError') return true;
  const msg = String(error?.message || error?.error_description || error || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('network timeout') ||
    msg.includes('load failed') ||
    msg.includes('internet connection') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('fetcherror') ||
    msg.includes('timeout')
  );
}

/**
 * Await a Supabase query builder with a timeout, never throwing.
 * Returns `{ data, error }` — on timeout/network throw, error is the caught exception.
 */
export async function dbCall(
  thenable: PromiseLike<any>,
  timeoutMs: number = OFFLINE_TIMEOUT_MS,
): Promise<{ data: any; error: any }> {
  try {
    const res: any = await withTimeout(thenable, timeoutMs);
    return { data: res?.data ?? null, error: res?.error ?? null };
  } catch (e: any) {
    return { data: null, error: e };
  }
}
