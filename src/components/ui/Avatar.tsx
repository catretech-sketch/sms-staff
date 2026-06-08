// src/components/ui/Avatar.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';

export interface AvatarProps {
  name: string;
  size?: number;
  ring?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 40, ring }) => {
  const { role } = useTheme();
  const initials = getInitials(name);
  const ringColor = ring ?? role.accent;
  const fontSize = Math.round(size * 0.38);

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: role.accentSoft,
        },
        ring !== undefined && { borderWidth: 2, borderColor: ringColor },
      ]}
    >
      <Text
        style={[
          TextScale.micro,
          { color: ringColor, fontSize, lineHeight: undefined },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
