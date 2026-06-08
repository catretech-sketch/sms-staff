// src/components/ui/roleCards/GardenerCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/icons';

interface GardenerCardProps {
  zones: string[];
  wateringDue: number;
  accent: string;
}

export const GardenerCard: React.FC<GardenerCardProps> = ({
  zones,
  wateringDue,
  accent,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Card>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="leaf" size={20} color={accent} strokeWidth={2} />
        <Text style={[TextScale.cardTitle, styles.headerText, { color: accent }]}>
          {t('role.gardener')}
        </Text>
      </View>

      {/* Zones */}
      <View style={styles.row}>
        <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
          {t('role.gardener.zones')}
        </Text>
        <Text style={[TextScale.body, { color: colors.ink }]}>
          {zones.join(', ')}
        </Text>
      </View>

      {/* Watering due */}
      <View style={styles.row}>
        <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
          {t('role.gardener.watering')}
        </Text>
        <Text style={[TextScale.body, { color: colors.ink }]}>
          {wateringDue}
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  row: {
    gap: 2,
    marginBottom: 8,
  },
});
