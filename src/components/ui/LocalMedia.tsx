// Local, generated media placeholder. A privacy app must never fetch media from a third-party
// server; real media will be decrypted local files. This renders a deterministic gradient from
// a seed, entirely on-device, no network.

import { LinearGradient } from 'expo-linear-gradient';
import { type StyleProp, type ViewStyle } from 'react-native';

const GRADIENTS: readonly (readonly [string, string])[] = [
  ['#2E3A59', '#111827'],
  ['#3B2E59', '#1B1230'],
  ['#2E594A', '#0F2E22'],
  ['#59492E', '#301F12'],
  ['#593B4E', '#2E1226'],
  ['#2E4F59', '#122A30'],
  ['#4A592E', '#2A3012'],
  ['#592E3B', '#30121B'],
];

const FALLBACK: readonly [string, string] = ['#2A2730', '#17161A'];

function pick(seed: string): readonly [string, string] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return GRADIENTS[h % GRADIENTS.length] ?? FALLBACK;
}

export function LocalMedia({ seed, radius = 0, style }: { seed: string; radius?: number; style?: StyleProp<ViewStyle> }) {
  const [from, to] = pick(seed);
  return <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: radius }, style]} />;
}
