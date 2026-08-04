/**
 * Per-business preference for the daily cash reminder popup.
 * Default is ON. Switching it off never affects the accountability
 * (audit) panel in Settings — the owner can keep recording there.
 */
const EVENT = 'bm:audit-reminder-pref';

function key(businessId: string) {
  return `bm:audit-reminder-enabled:${businessId}`;
}

export function isReminderEnabled(businessId?: string | null): boolean {
  if (!businessId) return false;
  try {
    return localStorage.getItem(key(businessId)) !== 'off';
  } catch {
    return true;
  }
}

export function setReminderEnabled(businessId: string, enabled: boolean) {
  try {
    localStorage.setItem(key(businessId), enabled ? 'on' : 'off');
  } catch { /* ignore */ }
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { businessId, enabled } }));
  } catch { /* ignore */ }
}

export function onReminderPrefChange(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
