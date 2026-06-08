// src/components/state/ErrorState.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Icon } from '@/components/icons';
import { Btn } from '@/components/ui/Btn';

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const msg = message ?? t('common.somethingWrong');

  return (
    <View style={styles.container}>
      <Icon name="alert" size={48} color={colors.danger} />
      <Text style={[TextScale.body, styles.message, { color: colors.inkSoft }]}>{msg}</Text>
      {onRetry && (
        <Btn variant="ghost" label={t('common.retry')} onPress={onRetry} />
      )}
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
