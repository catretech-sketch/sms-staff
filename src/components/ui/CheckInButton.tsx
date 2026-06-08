// src/components/ui/CheckInButton.tsx
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { useTranslation } from 'react-i18next';

export type CheckInState = 'locating' | 'out' | 'ready' | 'checkedIn';

export interface CheckInButtonProps {
  state: CheckInState;
  busy?: boolean;
  onPress: () => void;
  accent: string;
}

const SIZE = 184;
const RADIUS = SIZE / 2;

export const CheckInButton: React.FC<CheckInButtonProps> = ({
  state,
  busy = false,
  onPress,
  accent,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const disabled = state === 'locating' || state === 'out' || busy;

  // Pulse ring animation for ready state
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (state === 'ready' && !busy) {
      pulseScale.value = 1;
      pulseOpacity.value = 0.6;
      pulseScale.value = withRepeat(
        withTiming(1.25, { duration: 1000, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      );
      pulseOpacity.value = withRepeat(
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [state, busy, pulseScale, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Determine button background
  const getGradientColors = (): [string, string] => {
    if (disabled) return [colors.sunken, colors.sunken];
    if (state === 'checkedIn') return [colors.danger, colors.dangerSoft];
    return [accent, accent + 'CC'];
  };

  const gradientColors = getGradientColors();

  const label =
    state === 'checkedIn'
      ? t('attendance.checkOut')
      : state === 'ready'
        ? t('attendance.checkIn')
        : state === 'locating'
          ? t('attendance.locating')
          : t('attendance.outRange');

  const labelColor =
    disabled && state !== 'checkedIn' ? colors.inkSoft : colors.onPrimary;

  return (
    <View style={styles.wrapper}>
      {/* Pulse ring behind the button */}
      {state === 'ready' && !busy && (
        <Animated.View
          style={[
            styles.pulseRing,
            { borderColor: accent },
            pulseStyle,
          ]}
          pointerEvents="none"
        />
      )}

      <Pressable
        testID="checkin-btn"
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        accessible
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={styles.pressable}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {busy ? (
            <ActivityIndicator color={colors.onPrimary} size="large" />
          ) : (
            <Text style={[TextScale.button, { color: labelColor, textAlign: 'center' }]}>
              {label}
            </Text>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: RADIUS,
    borderWidth: 2,
  },
  pressable: {
    width: SIZE,
    height: SIZE,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS,
    paddingHorizontal: 24,
  },
});
