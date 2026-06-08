// src/components/ui/roleCards/ClerkCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/icons';

interface ClerkCardProps {
  pendingFiles: number;
  requestsOpen: number;
  accent: string;
}

export const ClerkCard: React.FC<ClerkCardProps> = ({
  pendingFiles,
  requestsOpen,
  accent,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Card>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="doc" size={20} color={accent} strokeWidth={2} />
        <Text style={[TextScale.cardTitle, styles.headerText, { color: accent }]}>
          {t('role.clerk')}
        </Text>
      </View>

      {/* Pending files */}
      <View style={styles.row}>
        <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
          {t('role.clerk.files')}
        </Text>
        <Text style={[TextScale.cardTitle, { color: colors.ink }]}>
          {pendingFiles}
        </Text>
      </View>

      {/* Open requests */}
      <View style={styles.row}>
        <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
          {t('role.clerk.requests')}
        </Text>
        <Text style={[TextScale.body, { color: colors.ink }]}>
          {requestsOpen}
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
