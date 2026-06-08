// src/components/state/EmptyState.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Icon, type IconName } from '@/components/icons';

export interface EmptyStateProps {
  message?: string;
  icon?: IconName;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, icon = 'gift' }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const msg = message ?? t('common.nothingHere');

  return (
    <View style={styles.container}>
      <Icon name={icon} size={48} color={colors.inkFaint} />
      <Text style={[TextScale.body, styles.message, { color: colors.inkSoft }]}>{msg}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  message: {
    textAlign: 'center',
  },
});
