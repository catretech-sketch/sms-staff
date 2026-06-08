// src/components/ui/roleCards/DriverCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Icon } from '@/components/icons';

interface DriverCardProps {
  busNo: string;
  routeName: string;
  licenseExpiresInDays: number;
  fitnessOk: boolean;
  accent: string;
}

export const DriverCard: React.FC<DriverCardProps> = ({
  busNo,
  routeName,
  licenseExpiresInDays,
  fitnessOk,
  accent,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Card>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="bus" size={20} color={accent} strokeWidth={2} />
        <Text style={[TextScale.cardTitle, styles.headerText, { color: accent }]}>
          {t('role.driver')}
        </Text>
      </View>

      {/* Bus & Route */}
      <View style={styles.row}>
        <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
          {t('role.driver.busRoute')}
        </Text>
        <Text style={[TextScale.body, { color: colors.ink }]}>
          {busNo}
        </Text>
        <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
          {routeName}
        </Text>
      </View>

      {/* Pills row */}
      <View style={styles.pillRow}>
        <Pill
          label={`${t('role.driver.license')} · ${t('role.driver.expiresIn', { n: licenseExpiresInDays })}`}
          color={licenseExpiresInDays <= 30 ? colors.danger : colors.primary}
          bg={licenseExpiresInDays <= 30 ? colors.dangerSoft : colors.primaryDim}
          icon="license"
        />
        <Pill
          label={`${t('role.driver.fitness')}${fitnessOk ? ` · ${t('role.driver.ok')}` : ''}`}
          color={fitnessOk ? colors.primary : colors.danger}
          bg={fitnessOk ? colors.primaryDim : colors.dangerSoft}
          icon="fitness"
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
