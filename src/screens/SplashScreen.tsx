// src/screens/SplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withDelay,
  withRepeat,
  useAnimatedStyle,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { useTranslation } from 'react-i18next';
import { FontFamily } from '@/theme/typography';

export interface SplashScreenProps {
  onDone: () => void;
}

const SPLASH_DELAY = 2200;

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const doneRef = useRef(false);

  // Always call the CURRENT onDone. The mount-time timer closure would otherwise
  // capture a stale prop (RootNavigator swaps a no-op onDone for the real one once
  // auth resolves, without remounting), which previously wedged the app on Splash.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Guard so tap + timer never double-fire
  const fireDone = () => {
    if (!doneRef.current) {
      doneRef.current = true;
      onDoneRef.current();
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fireDone();
    }, SPLASH_DELAY);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Logo entrance: scale 0.6→1, opacity 0→1 over ~0.8s ---
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);

  // --- Text entrance: translateY 14→0, opacity 0→1 over ~0.7s with 0.35s delay ---
  const textTranslateY = useSharedValue(14);
  const textOpacity = useSharedValue(0);

  // --- Pulse rings: opacity 1→0 on a 2s repeat, second ring offset by 0.9s ---
  const ring1Opacity = useSharedValue(1);
  const ring1Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(1);
  const ring2Scale = useSharedValue(1);

  // --- Bouncing dots: translateY 0→-8→0 on a 1s repeat ---
  const dot1Y = useSharedValue(0);
  const dot2Y = useSharedValue(0);
  const dot3Y = useSharedValue(0);

  // --- Drifting orbs ---
  const orb1X = useSharedValue(0);
  const orb1Y = useSharedValue(0);
  const orb2X = useSharedValue(0);
  const orb2Y = useSharedValue(0);

  useEffect(() => {
    // Logo entrance
    logoScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    logoOpacity.value = withTiming(1, { duration: 800 });

    // Text entrance (0.35s delay)
    textTranslateY.value = withDelay(350, withTiming(0, { duration: 700 }));
    textOpacity.value = withDelay(350, withTiming(1, { duration: 700 }));

    // Pulse rings (2s loop, second ring offset 0.9s)
    ring1Scale.value = withRepeat(
      withTiming(1.6, { duration: 2000, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    ring1Opacity.value = withRepeat(withTiming(0, { duration: 2000 }), -1, false);

    ring2Scale.value = withDelay(
      900,
      withRepeat(withTiming(1.6, { duration: 2000, easing: Easing.out(Easing.quad) }), -1, false),
    );
    ring2Opacity.value = withDelay(900, withRepeat(withTiming(0, { duration: 2000 }), -1, false));

    // Bouncing dots (1s loop, staggered)
    const dotAnim = (sv: SharedValue<number>, delay: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withTiming(-8, { duration: 400, easing: Easing.inOut(Easing.quad) }),
          -1,
          true,
        ),
      );
    };
    dotAnim(dot1Y, 0);
    dotAnim(dot2Y, 150);
    dotAnim(dot3Y, 300);

    // Drifting orbs
    orb1X.value = withRepeat(withTiming(20, { duration: 4000 }), -1, true);
    orb1Y.value = withRepeat(withTiming(-15, { duration: 3500 }), -1, true);
    orb2X.value = withRepeat(withTiming(-18, { duration: 4500 }), -1, true);
    orb2Y.value = withRepeat(withTiming(12, { duration: 3800 }), -1, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: textTranslateY.value }],
    opacity: textOpacity.value,
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const dot1Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot1Y.value }] }));
  const dot2Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot2Y.value }] }));
  const dot3Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot3Y.value }] }));

  const orb1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: orb1X.value }, { translateY: orb1Y.value }],
  }));
  const orb2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: orb2X.value }, { translateY: orb2Y.value }],
  }));

  return (
    <Pressable testID="splash" style={styles.fill} onPress={fireDone}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDim]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.fill}
      >
        {/* Drifting blurred orbs */}
        <Animated.View
          style={[styles.orb, styles.orb1, orb1Style, { backgroundColor: colors.onBrandSoft }]}
          pointerEvents="none"
        />
        <Animated.View
          style={[styles.orb, styles.orb2, orb2Style, { backgroundColor: colors.onBrandSoft }]}
          pointerEvents="none"
        />

        <View style={styles.center}>
          {/* Logo mark + pulse rings */}
          <View style={styles.logoContainer}>
            {/* Pulse ring 1 */}
            <Animated.View
              style={[
                styles.ring,
                ring1Style,
                { borderColor: colors.onPrimary },
              ]}
              pointerEvents="none"
            />
            {/* Pulse ring 2 */}
            <Animated.View
              style={[
                styles.ring,
                ring2Style,
                { borderColor: colors.onPrimary },
              ]}
              pointerEvents="none"
            />

            {/* Logo mark */}
            <Animated.View style={[styles.logoMark, { backgroundColor: colors.onBrandSoft }, logoStyle]}>
              <Text style={[styles.logoLetter, { color: colors.onPrimary }]}>S</Text>
            </Animated.View>
          </View>

          {/* App name + subtitle */}
          <Animated.View style={[styles.textBlock, textStyle]}>
            <Text style={[styles.appName, { color: colors.onPrimary }]}>SchoolMate</Text>
            <Text style={[styles.staffLabel, { color: colors.gold }]}>
              {t('staff').toUpperCase()}
            </Text>
          </Animated.View>

          {/* Three bouncing dots */}
          <View style={styles.dotsRow}>
            <Animated.View style={[styles.dot, { backgroundColor: colors.onPrimary }, dot1Style]} />
            <Animated.View style={[styles.dot, { backgroundColor: colors.onPrimary }, dot2Style]} />
            <Animated.View style={[styles.dot, { backgroundColor: colors.onPrimary }, dot3Style]} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const LOGO_SIZE = 80;
const RING_SIZE = LOGO_SIZE + 40;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
  },
  logoMark: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontFamily: FontFamily.displayBold,
    fontSize: 36,
    lineHeight: 42,
  },
  textBlock: {
    alignItems: 'center',
    marginTop: 24,
  },
  appName: {
    fontFamily: FontFamily.displayBold,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  staffLabel: {
    fontFamily: FontFamily.bodyExtraBold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 3,
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    opacity: 0.85,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 180,
    height: 180,
    top: '15%',
    left: '-20%',
    opacity: 0.4,
  },
  orb2: {
    width: 140,
    height: 140,
    bottom: '20%',
    right: '-10%',
    opacity: 0.3,
  },
});
