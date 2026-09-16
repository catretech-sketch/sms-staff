// src/components/ui/roleCards/ConductorCard.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/icons';

interface ConductorCardProps {
  busNo: string;
  routeName: string;
  shift?: string;
  studentsAssigned: number;
  accent: string;
  onViewDetails: () => void;
}

export const ConductorCard: React.FC<ConductorCardProps> = ({
  busNo,
  routeName,
  shift,
  studentsAssigned,
  accent,
  onViewDetails,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Card>
      <View style={styles.header}>
        <Icon name="visitor" size={20} color={accent} strokeWidth={2} />
        <Text style={[TextScale.cardTitle, styles.headerText, { color: accent }]}>
          {t('home.todaysDuty')}
        </Text>
        <Pressable testID="conductor-card-view-details" onPress={onViewDetails}>
          <Text style={[TextScale.caption, { color: accent }]}>{t('common.viewDetails')}</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        <View style={styles.cell}>
          <Text style={[TextScale.caption, { color: colors.inkSoft }]}>{t('home.assignedBus')}</Text>
          <Text style={[TextScale.bodyStrong, { color: colors.ink }]}>{busNo}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={[TextScale.caption, { color: colors.inkSoft }]}>{t('home.route')}</Text>
          <Text style={[TextScale.bodyStrong, { color: colors.ink }]}>{routeName}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={[TextScale.caption, { color: colors.inkSoft }]}>{t('home.shift')}</Text>
          <Text style={[TextScale.bodyStrong, { color: colors.ink }]}>{shift ?? '—'}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={[TextScale.caption, { color: colors.inkSoft }]}>{t('home.students')}</Text>
          <Text style={[TextScale.bodyStrong, { color: colors.ink }]}>{t('home.studentsAssigned', { n: studentsAssigned })}</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  headerText: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  cell: {
    width: '45%',
    gap: 2,
  },
});
