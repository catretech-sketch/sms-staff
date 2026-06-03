import type { ViewStyle } from 'react-native';

export interface ThemeColors {
  dark: boolean;
  bg: string;
  bgInk: string;
  surface: string;
  surface2: string;
  sunken: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  line: string;
  lineStrong: string;
  primary: string;
  primaryDim: string;
  onPrimary: string;
  gold: string;
  goldSoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warn: string;
  warnSoft: string;
  onBrandSoft: string;
  shadow: ViewStyle;
  shadowLg: ViewStyle;
}

const lightShadow: ViewStyle = {
  shadowColor: '#15231E',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.16,
  shadowRadius: 16,
  elevation: 4,
};
const lightShadowLg: ViewStyle = {
  shadowColor: '#15231E',
  shadowOffset: { width: 0, height: 22 },
  shadowOpacity: 0.28,
  shadowRadius: 34,
  elevation: 10,
};
const darkShadow: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.6,
  shadowRadius: 20,
  elevation: 6,
};
const darkShadowLg: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 24 },
  shadowOpacity: 0.7,
  shadowRadius: 40,
  elevation: 12,
};

export function makeTheme(dark: boolean): ThemeColors {
  if (!dark) {
    return {
      dark: false,
      bg: '#F2EEE4',
      bgInk: '#0E5C4A',
      surface: '#FFFFFF',
      surface2: '#FBF9F3',
      sunken: '#EBE6D9',
      ink: '#15231E',
      inkSoft: '#5E6E66',
      inkFaint: '#94A199',
      line: 'rgba(21,35,30,0.08)',
      lineStrong: 'rgba(21,35,30,0.14)',
      primary: '#0E5C4A',
      primaryDim: '#15735C',
      onPrimary: '#FFFFFF',
      gold: '#E7A92F',
      goldSoft: '#FBEAC2',
      success: '#2E9E6B',
      successSoft: '#D4EFE0',
      danger: '#DA5347',
      dangerSoft: '#F8DAD5',
      warn: '#E0922F',
      warnSoft: '#FBE6C6',
      onBrandSoft: 'rgba(255,255,255,0.14)',
      shadow: lightShadow,
      shadowLg: lightShadowLg,
    };
  }
  return {
    dark: true,
    bg: '#0B1512',
    bgInk: '#0B1512',
    surface: '#14241E',
    surface2: '#1A2C25',
    sunken: '#0E1B16',
    ink: '#ECF3EF',
    inkSoft: '#9CB0A7',
    inkFaint: '#647A71',
    line: 'rgba(255,255,255,0.07)',
    lineStrong: 'rgba(255,255,255,0.13)',
    primary: '#33BF9F',
    primaryDim: '#2AA489',
    onPrimary: '#04241C',
    gold: '#F2C766',
    goldSoft: 'rgba(242,199,102,0.16)',
    success: '#45C589',
    successSoft: 'rgba(69,197,137,0.16)',
    danger: '#F0786C',
    dangerSoft: 'rgba(240,120,108,0.16)',
    warn: '#F0B560',
    warnSoft: 'rgba(240,181,96,0.16)',
    onBrandSoft: 'rgba(255,255,255,0.10)',
    shadow: darkShadow,
    shadowLg: darkShadowLg,
  };
}
