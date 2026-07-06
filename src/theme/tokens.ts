// Kith design tokens. Single source of truth for color, space, radius, elevation, motion.
// Aesthetic: editorial + professional, bold challenger. Palette: Ember (dark-first, OLED).
// Accent coral is a SIGNAL only (send / unread / active / primary CTA), never a wash and
// never a message-bubble fill. Coral fills always carry the near-black onAccent label.

export type ColorScheme = 'light' | 'dark';

export interface SemanticColors {
  base: string; // app background floor
  surface: string; // primary card / row surface
  elevated: string; // raised surface (sheets, menus)
  overlay: string; // highest surface (popovers, toasts)
  hairline: string; // 1px separators, low-opacity
  scrim: string; // legibility floor placed under glass chrome
  ink: string; // primary text (AAA on base)
  inkSecondary: string; // metadata, timestamps (AAA/AA on base)
  inkTertiary: string; // decorative / placeholder only, large text only
  accent: string; // brand coral, used as a fill or high-emphasis signal
  accentText: string; // coral tuned for text/icon contrast per theme
  onAccent: string; // label color placed on an accent fill (near-black)
  success: string;
  warning: string;
  danger: string;
  info: string;
}

const emberDark: SemanticColors = {
  base: '#0B0B0C',
  surface: '#17161A',
  elevated: '#221F26',
  overlay: '#2A2730',
  hairline: 'rgba(244,244,245,0.08)',
  scrim: 'rgba(11,11,12,0.55)',
  ink: '#F4F4F5',
  inkSecondary: '#A1A1AA',
  inkTertiary: '#71717A',
  accent: '#FF5A2C',
  accentText: '#FF7A52',
  onAccent: '#0B0B0C',
  success: '#22C55E',
  warning: '#F5A524',
  danger: '#E5484D',
  info: '#4FA9FF',
};

const emberLight: SemanticColors = {
  base: '#F5F3EF',
  surface: '#FBFAF7',
  elevated: '#FEFDFB',
  overlay: '#FFFFFE',
  hairline: 'rgba(26,25,23,0.10)',
  scrim: 'rgba(245,243,239,0.55)',
  ink: '#1A1917',
  inkSecondary: '#57565A',
  inkTertiary: '#8A8990',
  accent: '#FF5A2C',
  accentText: '#C4400F',
  onAccent: '#0B0B0C',
  success: '#16A34A',
  warning: '#B45309',
  danger: '#C4353A',
  info: '#2563EB',
};

export const palette: Record<ColorScheme, SemanticColors> = {
  dark: emberDark,
  light: emberLight,
};

// 8pt grid with half-steps for tight vertical rhythm.
export const space = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
  '7xl': 80,
  '8xl': 96,
} as const;
export type SpaceToken = keyof typeof space;

export const radius = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;
export type RadiusToken = keyof typeof radius;

// Elevation as tinted, wide, low-alpha shadows (never a hard drop shadow).
export interface Elevation {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number; // android
}

export const elevation: Record<ColorScheme, Record<'e0' | 'e1' | 'e2' | 'e3', Elevation>> = {
  dark: {
    e0: { shadowColor: '#000000', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
    e1: { shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    e2: { shadowColor: '#000000', shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
    e3: { shadowColor: '#000000', shadowOpacity: 0.55, shadowRadius: 40, shadowOffset: { width: 0, height: 18 }, elevation: 16 },
  },
  light: {
    e0: { shadowColor: '#1A1917', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
    e1: { shadowColor: '#1A1917', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    e2: { shadowColor: '#1A1917', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
    e3: { shadowColor: '#1A1917', shadowOpacity: 0.16, shadowRadius: 40, shadowOffset: { width: 0, height: 18 }, elevation: 16 },
  },
};

// Motion. Transform/opacity only. Durations in ms, easing as cubic-bezier control points.
export const motion = {
  duration: {
    instant: 80,
    fast: 140,
    base: 220,
    slow: 300,
    slower: 420,
  },
  easing: {
    standard: [0.2, 0, 0, 1] as const,
    decelerate: [0, 0, 0, 1] as const,
    accelerate: [0.3, 0, 1, 1] as const,
    emphasized: [0.2, 0, 0, 1] as const,
  },
  spring: {
    soft: { damping: 22, stiffness: 180, mass: 1 },
    snappy: { damping: 18, stiffness: 260, mass: 1 },
    bouncy: { damping: 14, stiffness: 220, mass: 1 },
  },
} as const;

export const z = {
  base: 0,
  sticky: 10,
  header: 20,
  sheet: 30,
  overlay: 40,
  toast: 50,
  modal: 60,
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const minTouch = 44; // pt, minimum interactive target
