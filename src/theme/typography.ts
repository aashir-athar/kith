// Kith type system. Three voices: an expressive editorial DISPLAY (Bricolage Grotesque),
// a calm high-x-height BODY (Geist) tuned for message legibility, and a MONO (Geist Mono)
// for metadata (timestamps, receipts, handles, call durations). Emphasis via weight + size,
// never color. Display used only on peaks; chrome and threads stay quiet.

import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { useFonts } from 'expo-font';

export const fontFamily = {
  displayBold: 'BricolageGrotesque_700Bold',
  displayXBold: 'BricolageGrotesque_800ExtraBold',
  body: 'Geist_400Regular',
  bodyMedium: 'Geist_500Medium',
  bodySemibold: 'Geist_600SemiBold',
  bodyBold: 'Geist_700Bold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
} as const;

export interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

export const type = {
  displayXl: { fontFamily: fontFamily.displayXBold, fontSize: 34, lineHeight: 38, letterSpacing: -0.8 },
  displayLg: { fontFamily: fontFamily.displayBold, fontSize: 28, lineHeight: 32, letterSpacing: -0.6 },
  title: { fontFamily: fontFamily.displayBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  headline: { fontFamily: fontFamily.bodySemibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  bodyStrong: { fontFamily: fontFamily.bodySemibold, fontSize: 16, lineHeight: 22, letterSpacing: 0 },
  body: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 22, letterSpacing: 0 },
  callout: { fontFamily: fontFamily.body, fontSize: 15, lineHeight: 20, letterSpacing: 0 },
  subhead: { fontFamily: fontFamily.bodyMedium, fontSize: 14, lineHeight: 19, letterSpacing: 0 },
  footnote: { fontFamily: fontFamily.body, fontSize: 13, lineHeight: 17, letterSpacing: 0 },
  caption: { fontFamily: fontFamily.bodyMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  mono: { fontFamily: fontFamily.monoMedium, fontSize: 13, lineHeight: 16, letterSpacing: 0 },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof type;

export function useAppFonts(): [boolean, Error | null] {
  return useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });
}
