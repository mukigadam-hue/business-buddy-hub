// Precise activity-time formatter for the Discover page.
// Goal: help users tell apart truly active businesses from dormant ones at a glance.

export function timeAgo(input: string | number | Date | null | undefined): string {
  if (!input) return 'never';
  const then = typeof input === 'string' || typeof input === 'number'
    ? new Date(input).getTime()
    : input.getTime();
  if (!Number.isFinite(then)) return 'never';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const m = Math.floor(diffSec / 60);
  if (m < 60) {
    const s = diffSec % 60;
    return s && m < 5 ? `${m}m ${s}s ago` : `${m} min${m === 1 ? '' : 's'} ago`;
  }
  const h = Math.floor(m / 60);
  if (h < 24) {
    const mm = m % 60;
    return mm && h < 6 ? `${h}h ${mm}m ago` : `${h} hr${h === 1 ? '' : 's'} ago`;
  }
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const y = Math.floor(mo / 12);
  return `${y} year${y === 1 ? '' : 's'} ago`;
}

export type ActivityTone = 'live' | 'online' | 'recent' | 'today' | 'idle' | 'stale' | 'dead' | 'unknown';

export interface ActivityStatus {
  label: string;        // Human-readable status, e.g. "Online now", "Active 4 min ago", "Inactive — last seen 3 months ago"
  short: string;        // Compact label for tight UI spots
  dotClass: string;     // Tailwind classes for the status dot
  tone: ActivityTone;
  isActive: boolean;    // Convenience: true when the user is currently using the app (< 5 min)
}

export function activityStatus(input: string | number | Date | null | undefined): ActivityStatus {
  if (!input) {
    return {
      label: 'Never opened the app',
      short: 'Never active',
      dotClass: 'bg-muted-foreground/40',
      tone: 'unknown',
      isActive: false,
    };
  }
  const then = typeof input === 'string' || typeof input === 'number'
    ? new Date(input).getTime()
    : input.getTime();
  if (!Number.isFinite(then)) {
    return { label: 'Never opened the app', short: 'Never active', dotClass: 'bg-muted-foreground/40', tone: 'unknown', isActive: false };
  }
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (sec < 60) {
    return {
      label: 'Online now',
      short: 'Online now',
      dotClass: 'bg-green-500 ring-2 ring-green-500/30 animate-pulse',
      tone: 'live',
      isActive: true,
    };
  }
  if (sec < 5 * 60) {
    const m = Math.floor(sec / 60);
    return {
      label: `Active ${m} min${m === 1 ? '' : 's'} ago`,
      short: `${m}m ago`,
      dotClass: 'bg-green-500 animate-pulse',
      tone: 'online',
      isActive: true,
    };
  }
  if (sec < 60 * 60) {
    const m = Math.floor(sec / 60);
    return {
      label: `Active ${m} min${m === 1 ? '' : 's'} ago`,
      short: `${m}m ago`,
      dotClass: 'bg-green-500',
      tone: 'recent',
      isActive: false,
    };
  }
  if (sec < 24 * 60 * 60) {
    const h = Math.floor(sec / 3600);
    return {
      label: `Active ${h} hr${h === 1 ? '' : 's'} ago`,
      short: `${h}h ago`,
      dotClass: 'bg-amber-500',
      tone: 'today',
      isActive: false,
    };
  }
  if (sec < 7 * 24 * 60 * 60) {
    const d = Math.floor(sec / 86400);
    return {
      label: `Last seen ${d} day${d === 1 ? '' : 's'} ago`,
      short: `${d}d ago`,
      dotClass: 'bg-orange-500',
      tone: 'idle',
      isActive: false,
    };
  }
  if (sec < 30 * 24 * 60 * 60) {
    const d = Math.floor(sec / 86400);
    return {
      label: `Inactive — last seen ${d} days ago`,
      short: `${d}d ago`,
      dotClass: 'bg-red-500/80',
      tone: 'stale',
      isActive: false,
    };
  }
  return {
    label: `Inactive — last seen ${timeAgo(then)}`,
    short: timeAgo(then),
    dotClass: 'bg-muted-foreground/60',
    tone: 'dead',
    isActive: false,
  };
}

// Backward-compatible helper for callers that only need a dot color.
export function activityDotClass(input: string | number | Date | null | undefined): string {
  return activityStatus(input).dotClass;
}
