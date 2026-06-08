// src/components/ui/roleCards/GuardCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/icons';

interface GuardCardProps {
  gate: string;
  roundsDone: number;
  roundsTotal: number;
  visitorsToday: number;
  accent: string;
}

export const GuardCard: React.FC<GuardCardProps> = ({
  gate,
  roundsDone,
  roundsTotal,
  visitorsToday,
  accent,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Card>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="shield" size={20} color={accent} strokeWidth={2} />
        <Text style={[TextScale.cardTitle, styles.headerText, { color: accent }]}>
          {t('role.guard')}
        </Text>
      </View>

      {/* Gate */}
      <View style={styles.row}>
        <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
          {t('role.guard.gate')}
        </Text>
        <Text style={[TextScale.body, { color: colors.ink }]}>
          {gate}
        </Text>
      </View>

      {/* Rounds */}
      <View style={styles.row}>
        <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
          {t('role.guard.rounds')}
        </Text>
        <Text style={[TextScale.body, { color: colors.ink }]}>
          {roundsDone}/{roundsTotal}
        </Text>
      </View>

      {/* Visitors */}
      <View style={styles.row}>
        <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
          {t('role.guard.visitors')}
        </Text>
        <Text style={[TextScale.body, { color: colors.ink }]}>
          {visitorsToday}
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
