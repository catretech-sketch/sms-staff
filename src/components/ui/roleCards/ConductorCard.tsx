// src/components/ui/roleCards/ConductorCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Icon } from '@/components/icons';

interface ConductorCardProps {
  routeName: string;
  onBoard: number;
  capacity: number;
  nextStop: string;
  accent: string;
}

export const ConductorCard: React.FC<ConductorCardProps> = ({
  routeName,
  onBoard,
  capacity,
  nextStop,
  accent,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Card>
      <View style={styles.header}>
        <Icon name="visitor" size={20} color={accent} strokeWidth={2} />
        <Text style={[TextScale.cardTitle, styles.headerText, { color: accent }]}>
          {t('role.conductor')}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
          {t('role.conductor.route')}
        </Text>
        <Text style={[TextScale.body, { color: colors.ink }]}>
          {routeName}
        </Text>
      </View>

      <View style={styles.pillRow}>
        <Pill
          label={`${t('role.conductor.onBoard')} · ${onBoard}/${capacity}`}
          color={colors.primary}
          bg={colors.primaryDim}
          icon="visitor"
        />
        <Pill
          label={`${t('role.conductor.nextStop')} · ${nextStop}`}
          color={accent}
          bg={colors.surface2}
          icon="mapPin"
        />
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
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
