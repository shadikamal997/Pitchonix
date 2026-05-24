// Phase 36.1E — small relative-time helper. Keeps comment thread headers
// "5m ago" instead of full ISO timestamps. Falls back to a date string for
// anything over 7 days old so years/months stay precise.

export function relativeTime(iso: string | Date): string {
  const t = typeof iso === 'string' ? new Date(iso).getTime() : iso.getTime();
  if (!Number.isFinite(t)) return '';
  const delta = Math.max(0, Date.now() - t);
  const s = Math.floor(delta / 1000);
  if (s < 30)       return 'just now';
  if (s < 60)       return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)       return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)       return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)        return `${d}d ago`;
  return new Date(t).toLocaleDateString();
}
