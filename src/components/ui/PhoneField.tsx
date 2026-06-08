// src/components/ui/PhoneField.tsx
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Icon } from '@/components/icons';

export interface PhoneFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  accent: string;
  error?: string;
}

export const PhoneField: React.FC<PhoneFieldProps> = ({
  value,
  onChangeText,
  accent,
  error,
}) => {
  const { colors } = useTheme();

  return (
    <View>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.sunken,
          },
        ]}
      >
        {/* Phone icon in role accent */}
        <View style={[styles.iconWrap, { backgroundColor: accent + '22' }]}>
          <Icon name="phone" size={20} color={accent} strokeWidth={2} />
        </View>

        {/* +91 prefix */}
        <Text style={[TextScale.body, styles.prefix, { color: colors.inkSoft }]}>+91</Text>

        {/* Input */}
        <TextInput
          testID="phone-input"
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholder="98765 43210"
          placeholderTextColor={colors.inkFaint}
          style={[TextScale.body, styles.input, { color: colors.ink }]}
          maxLength={11}
          accessibilityLabel="phone number"
        />
      </View>

      {/* Error text */}
      {error ? (
        <Text style={[TextScale.caption, styles.error, { color: colors.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: 100,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    gap: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefix: {
    fontWeight: '700',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  error: {
    marginTop: 6,
    marginLeft: 16,
  },
});
