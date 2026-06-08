// src/components/ui/roleCards/CookCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Icon } from '@/components/icons';

interface CookCardProps {
  mealCount: number;
  menu: string[];
  lowStock: string[];
  accent: string;
}

export const CookCard: React.FC<CookCardProps> = ({
  mealCount,
  menu,
  lowStock,
  accent,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Card>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="pot" size={20} color={accent} strokeWidth={2} />
        <Text style={[TextScale.cardTitle, styles.headerText, { color: accent }]}>
          {t('role.cook')}
        </Text>
      </View>

      {/* Meal count */}
      <View style={styles.row}>
        <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
          {t('role.cook.meals')}
        </Text>
        <Text style={[TextScale.cardTitle, { color: colors.ink }]}>
          {mealCount}
        </Text>
      </View>

      {/* Menu */}
      {menu.length > 0 && (
        <View style={styles.row}>
          <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
            {t('role.cook.menu')}
          </Text>
          <Text style={[TextScale.body, { color: colors.ink }]}>
            {menu.join(', ')}
          </Text>
        </View>
      )}

      {/* Low stock */}
      {lowStock.length > 0 && (
        <View style={styles.pillRow}>
          <Pill
            label={`${t('role.cook.lowStock')}: ${lowStock.join(', ')}`}
            color={colors.danger}
            bg={colors.dangerSoft}
            icon="stock"
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
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
