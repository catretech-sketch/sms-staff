// src/components/ui/TextField.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, type KeyboardTypeOptions } from 'react-native';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Icon, type IconName } from '@/components/icons';

export interface TextFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  accent: string;
  icon: IconName;
  placeholder: string;
  testID?: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
}

export const TextField: React.FC<TextFieldProps> = ({
  value,
  onChangeText,
  accent,
  icon,
  placeholder,
  testID,
  error,
  keyboardType = 'default',
  maxLength,
  autoCapitalize = 'none',
  secureTextEntry = false,
}) => {
  const { colors } = useTheme();
  const [revealed, setRevealed] = useState(false);
  const masked = secureTextEntry && !revealed;

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
        <View style={[styles.iconWrap, { backgroundColor: accent + '22' }]}>
          <Icon name={icon} size={20} color={accent} strokeWidth={2} />
        </View>

        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          style={[TextScale.body, styles.input, { color: colors.ink }]}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={masked}
          accessibilityLabel={placeholder}
        />

        {secureTextEntry ? (
          <Pressable
            testID={testID ? `${testID}-toggle` : 'textfield-toggle'}
            onPress={() => setRevealed((r) => !r)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Icon name={revealed ? 'eyeOff' : 'eye'} size={20} color={colors.inkFaint} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>

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
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  error: {
    marginTop: 6,
    marginLeft: 16,
  },
});
