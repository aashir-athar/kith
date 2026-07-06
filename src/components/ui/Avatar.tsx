// Identity visual. Real photo when present, else a stable duotone gradient + initials.
// Initials are light because the gradients are always dark, independent of theme.

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text as RNText, View } from 'react-native';

import { avatarGradient, initials } from '@/lib/avatar';
import { fontFamily } from '@/theme/typography';

export interface AvatarProps {
  name: string;
  seed?: string;
  url?: string;
  size?: number;
}

export function Avatar({ name, seed, url, size = 48 }: AvatarProps) {
  const radius = size / 2;
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        transition={120}
      />
    );
  }
  const [from, to] = avatarGradient(seed ?? name);
  return (
    <LinearGradient
      colors={[from, to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={{ fontFamily: fontFamily.bodySemibold, fontSize: Math.round(size * 0.38), color: '#F5F4F2' }}>
        {initials(name)}
      </RNText>
    </LinearGradient>
  );
}
