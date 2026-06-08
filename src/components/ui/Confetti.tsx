// src/components/ui/Confetti.tsx
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

export interface ConfettiHandle {
  fire: () => void;
}

export interface ConfettiProps {
  count?: number;
  colors?: string[];
}

const DEFAULT_COLORS = ['#E08A3C', '#0E5C4A', '#E7A92F', '#DA5347', '#2E9E6B', '#4A90E2'];

// Deterministic trajectory derived from particle index (no Math.random)
function getTrajectory(index: number, total: number) {
  const angle = (index / total) * Math.PI * 2;
  const spread = 80 + (index % 5) * 20; // 80–160px horizontal spread
  const rise = 150 + (index % 4) * 30;  // 150–240px vertical rise
  return {
    tx: Math.round(Math.cos(angle) * spread),
    ty: -Math.round(Math.abs(Math.sin(angle)) * rise + 60),
    delay: (index % 5) * 40, // 0–160ms stagger
  };
}

interface ParticleItemProps {
  index: number;
  total: number;
  color: string;
  triggerFns: (() => void)[];
}

const ParticleItem: React.FC<ParticleItemProps> = ({ index, total, color, triggerFns }) => {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);

  const traj = getTrajectory(index, total);

  // Register trigger function at this particle's index slot
  triggerFns[index] = () => {
    tx.value = 0;
    ty.value = 0;
    opacity.value = 0;
    scale.value = 0.3;

    opacity.value = withDelay(traj.delay, withTiming(1, { duration: 80 }));
    scale.value = withDelay(
      traj.delay,
      withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.5)) }),
    );
    tx.value = withDelay(
      traj.delay,
      withTiming(traj.tx, { duration: 600, easing: Easing.out(Easing.quad) }),
    );
    ty.value = withDelay(
      traj.delay,
      withTiming(traj.ty, { duration: 600, easing: Easing.out(Easing.quad) }),
    );
    // Fade out after reaching peak
    opacity.value = withDelay(traj.delay + 400, withTiming(0, { duration: 300 }));
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
      { rotate: `${(index * 37) % 360}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: color, borderRadius: index % 3 === 0 ? 2 : 5 },
        animStyle,
      ]}
    />
  );
};

export const Confetti = forwardRef<ConfettiHandle, ConfettiProps>(
  ({ count = 24, colors = DEFAULT_COLORS }, ref) => {
    const triggerFns = useRef<(() => void)[]>([]);

    useImperativeHandle(ref, () => ({
      fire: () => {
        triggerFns.current.forEach(fn => fn());
      },
    }));

    const particles = Array.from({ length: count }, (_, i) => ({
      index: i,
      color: colors[i % colors.length],
    }));

    return (
      <View style={styles.container} pointerEvents="none">
        {particles.map(({ index, color }) => (
          <ParticleItem
            key={index}
            index={index}
            total={count}
            color={color}
            triggerFns={triggerFns.current}
          />
        ))}
      </View>
    );
  },
);

Confetti.displayName = 'Confetti';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    opacity: 0,
  },
});
