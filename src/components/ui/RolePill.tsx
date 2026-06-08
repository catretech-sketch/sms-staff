// src/components/ui/RolePill.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ROLES, type Role } from '@/theme/roles';
import { TextScale } from '@/theme/typography';
import { Icon } from '@/components/icons';

export interface RolePillProps {
  role: Role;
}

export const RolePill: React.FC<RolePillProps> = ({ role }) => {
  const { t } = useTranslation();
  const roleConfig = ROLES[role];
  const { accent, accentSoft, icon, labelKey } = roleConfig;

  return (
    <View style={[styles.pill, { backgroundColor: accentSoft }]}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={12} color={accent} strokeWidth={2} />
      </View>
      <Text style={[TextScale.micro, { color: accent }]}>{t(labelKey)}</Text>
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
