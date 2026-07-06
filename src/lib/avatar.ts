// Deterministic identity visuals. No egg icons: every user gets a stable duotone gradient
// derived from their id plus initials. Gradients are muted and deliberately avoid coral, so
// the accent stays reserved as a signal.

const GRADIENTS: readonly (readonly [string, string])[] = [
  ['#3B4A6B', '#1E2740'],
  ['#4A3B6B', '#271E40'],
  ['#3B6B5A', '#1E4034'],
  ['#6B5A3B', '#40341E'],
  ['#6B3B57', '#401E33'],
  ['#3B5A6B', '#1E3440'],
  ['#556B3B', '#33401E'],
  ['#5A3B6B', '#341E40'],
];

const FALLBACK: readonly [string, string] = ['#2A2730', '#17161A'];

function hash(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 33) ^ seed.charCodeAt(i);
  }
  return Math.abs(h);
}

export function avatarGradient(seed: string): readonly [string, string] {
  return GRADIENTS[hash(seed) % GRADIENTS.length] ?? FALLBACK;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const word = parts[0] ?? '';
    return (word.length >= 2 ? word.slice(0, 2) : word).toUpperCase();
  }
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts[parts.length - 1]?.charAt(0) ?? '';
  return (first + last).toUpperCase();
}
