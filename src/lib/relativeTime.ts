// Compact relative-time formatter — "2 min ago", "4 hr ago", "3 d ago", etc.
export function timeAgo(input: string | number | Date | null | undefined): string {
  if (!input) return 'a while ago';
  const then = typeof input === 'string' || typeof input === 'number' ? new Date(input).getTime() : input.getTime();
  if (!Number.isFinite(then)) return 'a while ago';
  const diffSec = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return 'just now';
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const y = Math.floor(mo / 12);
  return `${y} year${y === 1 ? '' : 's'} ago`;
}

// Dot color based on how recently active (green < 15 min, amber < 24h, gray otherwise).
export function activityDotClass(input: string | number | Date | null | undefined): string {
  if (!input) return 'bg-muted-foreground/40';
  const then = typeof input === 'string' || typeof input === 'number' ? new Date(input).getTime() : input.getTime();
  const mins = (Date.now() - then) / 60000;
  if (mins < 15) return 'bg-green-500';
  if (mins < 60 * 24) return 'bg-amber-500';
  return 'bg-muted-foreground/40';
}
