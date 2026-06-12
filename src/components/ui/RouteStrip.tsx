import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Card } from './Card';
import type { Route } from '@/data/domain';

export interface RouteStripProps {
  route: Route;
  progress: number; // 0..1 along the route
  accent: string;
  currentStopName?: string;
  nextStopName?: string;
}

const W = 300;
const H = 64;
const PAD = 20;

export const RouteStrip: React.FC<RouteStripProps> = ({ route, progress, accent, currentStopName, nextStopName }) => {
  const { colors } = useTheme();
  const n = route.stops.length;
  const xs = route.stops.map((_, i) => (n <= 1 ? PAD : PAD + ((W - 2 * PAD) * i) / (n - 1)));
  const y = H / 2;
  const busX = PAD + (W - 2 * PAD) * Math.max(0, Math.min(1, progress));

  return (
    <Card>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke={colors.sunken} strokeWidth={4} strokeLinecap="round" />
        <Line x1={PAD} y1={y} x2={busX} y2={y} stroke={accent} strokeWidth={4} strokeLinecap="round" />
        {xs.map((x, i) => (
          <Circle key={route.stops[i].id} cx={x} cy={y} r={5} fill={x <= busX ? accent : colors.surface} stroke={accent} strokeWidth={2} />
        ))}
        <Circle cx={busX} cy={y} r={8} fill={accent} stroke={colors.surface} strokeWidth={3} />
      </Svg>
      <View style={styles.labels}>
        <Text style={[TextScale.caption, { color: colors.inkSoft }]} numberOfLines={1}>
          {currentStopName ?? route.stops[0]?.name}
        </Text>
        <Text style={[TextScale.caption, { color: accent }]} numberOfLines={1}>
          → {nextStopName ?? route.stops[route.stops.length - 1]?.name}
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
});
