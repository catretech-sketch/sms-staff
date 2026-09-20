import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';

export const RouteUnavailableBadge: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View testID="route-unavailable-badge" style={[styles.pill, { backgroundColor: colors.surface, ...colors.shadow }]}>
      <Text style={[TextScale.micro, { color: colors.inkSoft }]}>{t('trip.routeUnavailable')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
