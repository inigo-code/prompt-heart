import { useColorScheme } from 'react-native';

const light = {
  bg: '#F7F5F0',
  card: '#FFFFFF',
  cardPinned: '#FFF8E6',
  text: '#1D1B18',
  textMuted: '#77716A',
  border: '#E6E1D8',
  accent: '#E0A422',
  accentText: '#1D1B18',
  chip: '#ECE8E0',
  chipActive: '#1D1B18',
  chipActiveText: '#FFFFFF',
  danger: '#D64545',
  toast: '#1D1B18',
  toastText: '#FFFFFF',
};

const dark: typeof light = {
  bg: '#141311',
  card: '#1F1D1A',
  cardPinned: '#2A2415',
  text: '#F2EFEA',
  textMuted: '#9A948C',
  border: '#2E2B27',
  accent: '#F2B84B',
  accentText: '#141311',
  chip: '#2A2724',
  chipActive: '#F2EFEA',
  chipActiveText: '#141311',
  danger: '#F06A6A',
  toast: '#F2EFEA',
  toastText: '#141311',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
