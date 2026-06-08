// src/components/ui/roleCards/PeonCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Icon } from '@/components/icons';

interface PeonCardProps {
  errands: number;
  bellDuty: boolean;
  accent: string;
}

export const PeonCard: React.FC<PeonCardProps> = ({
  errands,
  bellDuty,
  accent,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Card>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="bell" size={20} color={accent} strokeWidth={2} />
        <Text style={[TextScale.cardTitle, styles.headerText, { color: accent }]}>
          {t('role.peon')}
        </Text>
      </View>

      {/* Errands */}
      <View style={styles.row}>
        <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
          {t('role.peon.errands')}
        </Text>
        <Text style={[TextScale.cardTitle, { color: colors.ink }]}>
          {errands}
        </Text>
      </View>

      {/* Bell duty */}
      {bellDuty && (
        <View style={styles.pillRow}>
          <Pill
            label={t('role.peon.bellDuty')}
            color={accent}
            bg={colors.primaryDim}
            icon="bell"
          />
        </View>
      )}
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
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
