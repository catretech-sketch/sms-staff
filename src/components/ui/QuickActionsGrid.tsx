// src/components/ui/QuickActionsGrid.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { SectionLabel } from './SectionLabel';
import { Icon } from '@/components/icons';
import type { IconName } from '@/components/icons';

export interface QuickAction {
  testID: string;
  label: string;
  icon: IconName;
  onPress: () => void;
}

export interface QuickActionsGridProps {
  title: string;
  actions: QuickAction[];
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({ title, actions }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <SectionLabel title={title} />
      <View style={styles.grid}>
        {actions.map((a) => (
          <Pressable
            key={a.testID}
            testID={a.testID}
            onPress={a.onPress}
            style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <Icon name={a.icon} size={22} color={colors.ink} />
            <Text style={[TextScale.caption, { color: colors.ink }]} numberOfLines={2}>
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
