// src/components/ui/Ring.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';

export interface RingProps {
  value: number;
  target: number;
  size?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export const Ring: React.FC<RingProps> = ({
  value,
  target,
  size = 88,
  label,
  sublabel,
  color,
}) => {
  const { colors, role } = useTheme();
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, target > 0 ? value / target : 0));
  const dashOffset = circumference * (1 - progress);
  const arcColor = color ?? role.accent;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track circle */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={colors.sunken}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={arcColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      {/* Center labels — constrained to the ring's inner circle so a long sublabel
          (e.g. "Hours this week") wraps in place instead of spilling past the arc. */}
      <View style={[styles.center, { maxWidth: size * 0.62 }]} pointerEvents="none">
        {label !== undefined && (
          <Text style={[TextScale.cardTitle, { color: colors.ink, textAlign: 'center' }]}>{label}</Text>
        )}
        {sublabel !== undefined && (
          <Text style={[TextScale.caption, { color: colors.inkSoft, textAlign: 'center' }]}>{sublabel}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
