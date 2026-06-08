// src/components/ui/IconBtn.tsx
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/components/icons';

export interface IconBtnProps {
  icon: IconName;
  onPress: () => void;
  color?: string;
  bg?: string;
  size?: number;
  label: string;
  testID?: string;
}

export const IconBtn: React.FC<IconBtnProps> = ({
  icon,
  onPress,
  color,
  bg,
  size = 24,
  label,
  testID,
}) => {
  const { colors } = useTheme();
  const iconColor = color ?? colors.ink;
  const bgColor = bg ?? 'transparent';

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.base,
        {
          width: Math.max(44, size + 12),
          height: Math.max(44, size + 12),
          backgroundColor: bgColor,
        },
      ]}
    >
      <Icon name={icon} size={size} color={iconColor} strokeWidth={2} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
