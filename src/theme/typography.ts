// Font families — loaded in App.tsx via @expo-google-fonts/{sora,manrope}
export const FontFamily = {
  // Sora — display / headings / numbers
  displayRegular: 'Sora_400Regular',
  displayMedium: 'Sora_500Medium',
  displaySemiBold: 'Sora_600SemiBold',
  displayBold: 'Sora_700Bold',
  displayExtraBold: 'Sora_800ExtraBold',
  // Manrope — body / UI
  bodyMedium: 'Manrope_500Medium',
  bodySemiBold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyExtraBold: 'Manrope_800ExtraBold',
} as const;

// Type scale (from the handoff). Components apply color from the active theme.
export const TextScale = {
  hero: { fontFamily: FontFamily.displayBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  screenTitle: { fontFamily: FontFamily.displayBold, fontSize: 21, lineHeight: 27, letterSpacing: -0.3 },
  cardTitle: { fontFamily: FontFamily.displayBold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: FontFamily.bodySemiBold, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: FontFamily.bodyExtraBold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: FontFamily.bodySemiBold, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: FontFamily.bodyExtraBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.8 },
  button: { fontFamily: FontFamily.bodyExtraBold, fontSize: 16, lineHeight: 20 },
} as const;
