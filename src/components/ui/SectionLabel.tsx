// src/components/ui/SectionLabel.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';

export interface SectionLabelProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({
  title,
  actionLabel,
  onAction,
}) => {
  const { colors, role } = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[TextScale.cardTitle, { color: colors.ink }]}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} accessible accessibilityRole="button">
          <Text style={[TextScale.caption, { color: role.accent }]}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
