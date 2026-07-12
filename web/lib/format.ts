export function timeLabel(ms: number): string {
  if (!ms) return '';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const letters = parts.slice(0, 2).map((p) => p[0] ?? '').join('');
  return letters.toUpperCase() || '?';
}

const COLORS = ['#c2410c', '#b45309', '#9a3412', '#3f6212', '#166534', '#155e75', '#1e3a8a', '#5b21b6', '#86198f', '#9f1239', '#7c2d12', '#4d7c0f'];

export function avatarColor(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return COLORS[h % COLORS.length] ?? COLORS[0]!;
}

export function statusMark(status: string): string {
  if (status === 'read') return 'Read';
  if (status === 'delivered') return 'Delivered';
  if (status === 'sent') return 'Sent';
  if (status === 'failed') return 'Failed';
  return 'Sending';
}
