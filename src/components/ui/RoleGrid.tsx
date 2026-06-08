// src/components/ui/RoleGrid.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { ROLES, ROLE_KEYS, type Role } from '@/theme/roles';
import { TextScale } from '@/theme/typography';
import { Icon } from '@/components/icons';

export interface RoleGridProps {
  selected: Role;
  onSelect: (r: Role) => void;
}

export const RoleGrid: React.FC<RoleGridProps> = ({ selected, onSelect }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.grid}>
      {ROLE_KEYS.map((key) => {
        const roleConfig = ROLES[key];
        const isSelected = key === selected;
        return (
          <Pressable
            key={key}
            testID={`role-${key}`}
            onPress={() => onSelect(key)}
            accessibilityRole="button"
            accessibilityLabel={t(roleConfig.labelKey)}
            style={[
              styles.tile,
              {
                backgroundColor: isSelected ? roleConfig.accent : colors.surface,
                borderColor: isSelected ? roleConfig.accent : colors.sunken,
                // subtle lift shadow when selected
                elevation: isSelected ? 4 : 0,
                shadowOpacity: isSelected ? 0.18 : 0,
                transform: [{ translateY: isSelected ? -2 : 0 }],
              },
            ]}
          >
            <Icon
              name={roleConfig.icon}
              size={24}
              color={isSelected ? '#FFFFFF' : roleConfig.accent}
              strokeWidth={2}
            />
            <Text
              style={[
                TextScale.micro,
                styles.label,
                { color: isSelected ? '#FFFFFF' : colors.ink },
              ]}
              numberOfLines={1}
            >
              {t(roleConfig.labelKey)}
            </Text>
          </Pressable>
        );
      })}
      {/* Hidden spacer keeps the bottom row of 3 at the same width as the top row of 4 */}
      <View style={styles.spacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    // 4 columns with gap: roughly (100% - 3*10px) / 4
    // Fixed width (no flexGrow) keeps all rows uniform
    flexBasis: '22%',
    flexGrow: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  spacer: {
    flexBasis: '22%',
    flexGrow: 0,
  },
  label: {
    textAlign: 'center',
  },
});
