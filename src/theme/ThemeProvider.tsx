// Theme context. Resolves system/light/dark, persists the user's choice, and exposes the
// full token set so no component ever reaches for a raw hex. Dark-first: when the system
// scheme is unavailable we default to dark (Ember is designed dark-first for OLED).

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import {
  elevation as elevationTokens,
  hitSlop,
  minTouch,
  motion,
  palette,
  radius,
  space,
  z,
  type ColorScheme,
  type Elevation,
  type SemanticColors,
} from './tokens';
import { type as typeScale } from './typography';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'kith.theme.mode';

export interface Theme {
  mode: ThemeMode;
  scheme: ColorScheme;
  colors: SemanticColors;
  elevation: Record<'e0' | 'e1' | 'e2' | 'e3', Elevation>;
  space: typeof space;
  radius: typeof radius;
  motion: typeof motion;
  type: typeof typeScale;
  z: typeof z;
  hitSlop: typeof hitSlop;
  minTouch: number;
  ready: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<Theme | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }): ReactNode {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active && isThemeMode(stored)) setModeState(stored);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const scheme: ColorScheme = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;

  const value = useMemo<Theme>(
    () => ({
      mode,
      scheme,
      colors: palette[scheme],
      elevation: elevationTokens[scheme],
      space,
      radius,
      motion,
      type: typeScale,
      z,
      hitSlop,
      minTouch,
      ready,
      setMode,
    }),
    [mode, scheme, ready, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
