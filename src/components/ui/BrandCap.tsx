// src/components/ui/BrandCap.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Icon } from '@/components/icons';

export interface BrandCapProps {
  schoolName?: string;
  onPressLanguage: () => void;
  languageNative: string;
}

export const BrandCap: React.FC<BrandCapProps> = ({
  schoolName,
  onPressLanguage,
  languageNative,
}) => {
  const { colors } = useTheme();

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDim]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.cap}
    >
      {/* Language pill — top right */}
      <Pressable
        onPress={onPressLanguage}
        style={styles.langPill}
        accessibilityRole="button"
        accessibilityLabel="language picker"
      >
        <Icon name="globe" size={14} color="#FFFFFF" strokeWidth={2} />
        <Text style={[TextScale.micro, styles.langText]}>{languageNative}</Text>
        <Icon name="chevronDown" size={12} color="#FFFFFF" strokeWidth={2} />
      </Pressable>

      {/* Logo + app name */}
      <View style={styles.logoRow}>
        {/* Logo placeholder — simple filled circle mark */}
        <View style={[styles.logoMark, { borderColor: 'rgba(255,255,255,0.5)' }]}>
          <Text style={styles.logoLetter}>S</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={[TextScale.hero, styles.appName]}>SchoolMate Staff</Text>
          {schoolName ? (
            <Text style={[TextScale.caption, styles.schoolName]}>{schoolName}</Text>
          ) : null}
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  cap: {
    flexShrink: 0,
    paddingTop: 52,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  langPill: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  langText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  titleBlock: {
    gap: 2,
  },
  appName: {
    color: '#FFFFFF',
  },
  schoolName: {
    color: 'rgba(255,255,255,0.8)',
  },
});
