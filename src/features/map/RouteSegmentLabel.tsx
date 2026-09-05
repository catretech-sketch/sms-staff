import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';

export interface RouteSegmentLabelProps {
  distanceKm: number;
  durationMin?: number;
}

export const RouteSegmentLabel: React.FC<RouteSegmentLabelProps> = ({ distanceKm, durationMin }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const km = distanceKm.toFixed(1);
  const label =
    durationMin != null ? t('trip.routeSegment', { min: durationMin, km }) : t('trip.routeSegmentDistance', { km });

  return (
    <View testID="route-segment-label" style={[styles.pill, { backgroundColor: colors.surface, ...colors.shadow }]}>
      <Text style={[TextScale.micro, { color: colors.ink }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
