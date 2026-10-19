import { Platform } from 'react-native';

/** Lalima design tokens, mirrored from the website's app/globals.css. */
export const colors = {
  ivory: '#fbf7f2',
  sand: '#f3eae0',
  linen: '#ebdfd2',
  white: '#ffffff',
  plum50: '#f8f1f6',
  plum100: '#efe0eb',
  plum200: '#dcc0d5',
  plum300: '#c29bb7',
  plum500: '#7a4069',
  plum700: '#4a2741',
  plum800: '#3a1f33',
  plum900: '#2a1626',
  rose50: '#fbf1f0',
  rose100: '#f4dcd8',
  rose300: '#dcaaa9',
  rose500: '#b76e79',
  rose600: '#9f5763',
  ink: '#231a20',
  muted: '#6e6069',
  line: '#e7dcd3',
  success: '#2f7a5b',
  warning: '#a8691a',
  danger: '#b2423e',
};

export const fonts = {
  display: 'PlayfairDisplay_600SemiBold',
  displayRegular: 'PlayfairDisplay_400Regular',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

export const shadow = Platform.select({
  web: { boxShadow: '0 8px 24px -8px rgba(42,22,38,0.14)' } as object,
  default: {
    shadowColor: colors.plum900,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});

export const gradients = {
  hero: [colors.plum900, colors.plum700, colors.plum500] as const,
  rose: [colors.rose500, colors.rose300] as const,
};
