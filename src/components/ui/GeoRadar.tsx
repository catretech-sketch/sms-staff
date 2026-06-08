// src/components/ui/GeoRadar.tsx
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';

export interface GeoRadarProps {
  state: 'locating' | 'in' | 'out';
  distanceM?: number;
  accuracyM?: number;
  accent: string;
}

const SIZE = 188;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADII = [28, 50, 74];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const GeoRadar: React.FC<GeoRadarProps> = ({ state, distanceM, accuracyM, accent }) => {
  const { colors } = useTheme();

  // Sweep animation for locating state
  const sweepOpacity = useSharedValue(state === 'locating' ? 1 : 0);
  const sweepRadius = useSharedValue(RADII[0]);

  useEffect(() => {
    if (state === 'locating') {
      sweepOpacity.value = 1;
      sweepRadius.value = RADII[0];
      sweepRadius.value = withRepeat(
        withTiming(RADII[2], { duration: 1400, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      );
    } else {
      sweepOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [state, sweepOpacity, sweepRadius]);

  const sweepAnimatedProps = useAnimatedProps(() => ({
    r: sweepRadius.value,
    opacity: sweepOpacity.value * (1 - (sweepRadius.value - RADII[0]) / (RADII[2] - RADII[0])),
  }));

  const dotColor =
    state === 'in' ? colors.success : state === 'out' ? colors.danger : colors.inkFaint;

  const ringColor = colors.line;
  const ringStroke = colors.lineStrong;

  return (
    <View style={[styles.container, { flexShrink: 0 }]}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Concentric duty-fence rings */}
        {RADII.map((r, i) => (
          <Circle
            key={i}
            cx={CX}
            cy={CY}
            r={r}
            fill={i % 2 === 0 ? 'none' : ringColor}
            stroke={ringStroke}
            strokeWidth={1}
          />
        ))}

        {/* Sweep animation for locating */}
        {state === 'locating' && (
          <AnimatedCircle
            cx={CX}
            cy={CY}
            fill={accent}
            animatedProps={sweepAnimatedProps}
          />
        )}

        {/* Center duty-post pin */}
        <G>
          {/* Pin base circle */}
          <Circle cx={CX} cy={CY} r={10} fill={accent} />
          {/* Pin marker dot */}
          <Circle cx={CX} cy={CY} r={4} fill="white" />
        </G>

        {/* "You" dot — positioned slightly offset from center */}
        <Circle
          cx={CX + (state === 'out' ? 55 : state === 'in' ? 20 : 30)}
          cy={CY + (state === 'out' ? -10 : state === 'in' ? 15 : 0)}
          r={7}
          fill={dotColor}
          stroke="white"
          strokeWidth={2}
        />
      </Svg>

      {/* Status text below */}
      {(distanceM !== undefined || accuracyM !== undefined) && (
        <View style={styles.textRow}>
          {distanceM !== undefined && (
            <Text style={[TextScale.micro, { color: colors.inkSoft }]}>
              {Math.round(distanceM)} m
            </Text>
          )}
          {accuracyM !== undefined && (
            <Text style={[TextScale.micro, { color: colors.inkFaint }]}>
              {' '}±{Math.round(accuracyM)} m
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textRow: {
    flexDirection: 'row',
    marginTop: 4,
    position: 'absolute',
    bottom: 4,
  },
});
