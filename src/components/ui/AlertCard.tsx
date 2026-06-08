// src/components/ui/AlertCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Icon } from '@/components/icons';

export interface AlertCardProps {
  message: string;
}

export const AlertCard: React.FC<AlertCardProps> = ({ message }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.goldSoft }]}>
      <Icon name="alert" size={20} color={colors.gold} strokeWidth={2} />
      <Text style={[TextScale.body, { color: colors.ink, flex: 1 }]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
});
