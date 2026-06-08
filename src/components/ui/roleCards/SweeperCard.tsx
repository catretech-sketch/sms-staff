// src/components/ui/roleCards/SweeperCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Icon } from '@/components/icons';

interface SweeperCardProps {
  blocks: string[];
  suppliesLow: string[];
  accent: string;
}

export const SweeperCard: React.FC<SweeperCardProps> = ({
  blocks,
  suppliesLow,
  accent,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Card>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="broom" size={20} color={accent} strokeWidth={2} />
        <Text style={[TextScale.cardTitle, styles.headerText, { color: accent }]}>
          {t('role.sweeper')}
        </Text>
      </View>

      {/* Blocks */}
      <View style={styles.row}>
        <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
          {t('role.sweeper.blocks')}
        </Text>
        <Text style={[TextScale.body, { color: colors.ink }]}>
          {blocks.join(', ')}
        </Text>
      </View>

      {/* Supplies low */}
      {suppliesLow.length > 0 && (
        <View style={styles.pillRow}>
          <Pill
            label={`${t('role.sweeper.supplies')}: ${suppliesLow.join(', ')}`}
            color={colors.danger}
            bg={colors.dangerSoft}
            icon="supplies"
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
    flexWrap: 'wrap',
    gap: 8,
  },
});
