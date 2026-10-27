import { useColorScheme } from 'react-native';

import { useSettings } from '@/settings/SettingsProvider';
import type { AccentKey } from '@/settings/SettingsProvider';

const light = {
  dark: false,
  bg: '#F6F4EF',
  card: '#FFFFFF',
  cardPinned: '#FFF8E8',
  elevated: '#FFFFFF',
  text: '#1C1A17',
  textMuted: '#76706A',
  border: '#E5E0D7',
  accent: '#D99A1E',
  accentText: '#1C1A17',
  accentSoft: '#F7E7C4',
  chip: '#ECE8E0',
  chipActive: '#1C1A17',
  chipActiveText: '#FFFFFF',
  danger: '#D14343',
  toast: '#1C1A17',
  toastText: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.35)',
};

const dark: typeof light = {
  dark: true,
  bg: '#121110',
  card: '#1C1B19',
  cardPinned: '#272217',
  elevated: '#232220',
  text: '#F2EFEA',
  textMuted: '#9C968E',
  border: '#2D2A26',
  accent: '#F2B84B',
  accentText: '#121110',
  accentSoft: '#3A2F17',
  chip: '#272522',
  chipActive: '#F2EFEA',
  chipActiveText: '#121110',
  danger: '#F06A6A',
  toast: '#F2EFEA',
  toastText: '#121110',
  overlay: 'rgba(0,0,0,0.55)',
};

export type Theme = typeof light;

/**
 * The type scale. Every text size in the app is one of these steps; pick the nearest one rather than
 * a new number. (Sizes computed from a component's own size, like avatar initials, stay computed.)
 */
export const font = {
  caption: 12,
  footnote: 13,
  body: 15,
  headline: 17,
  title: 20,
  title2: 24,
  largeTitle: 28,
} as const;

/** Elevation, as boxShadow strings in a warm tint that matches the backgrounds. */
export const shadow = {
  subtle: '0 1px 3px rgba(28, 26, 23, 0.12)',
  raised: '0 4px 12px rgba(28, 26, 23, 0.20)',
  floating: '0 6px 16px rgba(28, 26, 23, 0.24)',
} as const;

type AccentSpec = { label: string; light: [string, string, string]; dark: [string, string, string] };

// [accent, text on accent, soft tint] for each scheme.
export const ACCENTS: Record<AccentKey, AccentSpec> = {
  amber: { label: 'Amber', light: ['#D99A1E', '#1C1A17', '#F7E7C4'], dark: ['#F2B84B', '#121110', '#3A2F17'] },
  blue: { label: 'Blue', light: ['#3467D6', '#FFFFFF', '#DCE6FA'], dark: ['#7AA2FF', '#0E1424', '#1B2640'] },
  green: { label: 'Green', light: ['#258A5C', '#FFFFFF', '#D5EFE2'], dark: ['#52C98F', '#0C1A13', '#163327'] },
  rose: { label: 'Rose', light: ['#C93D70', '#FFFFFF', '#F7DCE6'], dark: ['#F27CA5', '#22101A', '#3A1B28'] },
  violet: { label: 'Violet', light: ['#6E52D9', '#FFFFFF', '#E5DFFA'], dark: ['#A693FF', '#16112B', '#29224A'] },
};

export function buildTheme(isDark: boolean, accent: AccentKey): Theme {
  const base = isDark ? dark : light;
  const [a, aText, aSoft] = ACCENTS[accent][isDark ? 'dark' : 'light'];
  return { ...base, accent: a, accentText: aText, accentSoft: aSoft, cardPinned: isDark ? aSoft : `${aSoft}99` };
}

export function useTheme(): Theme {
  const system = useColorScheme();
  const { settings } = useSettings();
  const isDark = settings.themeMode === 'system' ? system === 'dark' : settings.themeMode === 'dark';
  return buildTheme(isDark, settings.accent);
}
