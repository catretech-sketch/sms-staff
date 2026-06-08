// src/components/ui/Btn.tsx
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Icon, type IconName } from '@/components/icons';

export interface BtnProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  accent?: string;
  icon?: IconName;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export const Btn: React.FC<BtnProps> = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accent,
  icon,
  testID,
  style,
}) => {
  const { colors, role } = useTheme();
  const isPrimary = variant === 'primary';
  const fillColor = accent ?? role.accent;
  const isDisabled = disabled || loading;

  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    isPrimary
      ? [styles.primary, { backgroundColor: fillColor, opacity: isDisabled ? 0.5 : 1 }]
      : [styles.ghost, { borderColor: fillColor, opacity: isDisabled ? 0.5 : 1 }],
    style,
  ];

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessible
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={containerStyle}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.onPrimary : fillColor} />
      ) : (
        <View style={styles.row}>
          {icon && (
            <View style={styles.iconWrap}>
              <Icon
                name={icon}
                size={18}
                color={isPrimary ? colors.onPrimary : fillColor}
                strokeWidth={2}
              />
            </View>
          )}
          <Text
            style={[
              TextScale.button,
              { color: isPrimary ? colors.onPrimary : fillColor },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primary: {
    height: 54,
  },
  ghost: {
    height: 44,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    marginRight: 2,
  },
});
