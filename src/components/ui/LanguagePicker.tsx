// src/components/ui/LanguagePicker.tsx
import React from 'react';
import { Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Icon } from '@/components/icons';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/i18n';

export interface LanguagePickerProps {
  visible: boolean;
  current: LanguageCode;
  onSelect: (c: LanguageCode) => void;
  onClose: () => void;
}

export const LanguagePicker: React.FC<LanguagePickerProps> = ({
  visible,
  current,
  onSelect,
  onClose,
}) => {
  const { colors, role } = useTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Full-screen scrim */}
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="close language picker">
        {/* Card — stop propagation so tapping inside doesn't close */}
        <Pressable style={[styles.card, { backgroundColor: colors.surface }]} onPress={() => {}}>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === current;
            return (
              <Pressable
                key={lang.code}
                style={[
                  styles.row,
                  isSelected && { backgroundColor: role.accentSoft },
                ]}
                onPress={() => onSelect(lang.code)}
                accessibilityRole="button"
                accessibilityLabel={lang.native}
              >
                <Text
                  style={[
                    TextScale.body,
                    { color: isSelected ? role.accent : colors.ink, flex: 1 },
                  ]}
                >
                  {lang.native}
                </Text>
                {isSelected && (
                  <Icon name="check" size={18} color={role.accent} strokeWidth={2.5} />
                )}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});
