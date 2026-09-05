// src/components/ui/Pill.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TextScale } from '@/theme/typography';
import { Icon, type IconName } from '@/components/icons';

export interface PillProps {
  label: string;
  color: string;
  bg: string;
  icon?: IconName;
  testID?: string;
}

export const Pill: React.FC<PillProps> = ({ label, color, bg, icon, testID }) => {
  return (
    <View testID={testID} style={[styles.pill, { backgroundColor: bg }]}>
      {icon && (
        <View style={styles.iconWrap}>
          <Icon name={icon} size={12} color={color} strokeWidth={2} />
        </View>
      )}
      <Text style={[TextScale.micro, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  iconWrap: {
    marginRight: 4,
  },
});
