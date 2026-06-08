// src/components/ui/Header.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Avatar } from './Avatar';
import { IconBtn } from './IconBtn';

export interface HeaderProps {
  schoolName: string;
  firstName: string;
  staffName: string;
  dark: boolean;
  onToggleTheme: () => void;
  onPressBell?: () => void;
  notifications?: number;
}

export const Header: React.FC<HeaderProps> = ({
  schoolName,
  firstName,
  staffName,
  dark,
  onToggleTheme,
  onPressBell,
  notifications,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Left: school logo + school name */}
      <View style={styles.left}>
        <Avatar name={schoolName} size={40} />
        <View style={styles.textBlock}>
          <Text style={[TextScale.cardTitle, { color: colors.ink }]} numberOfLines={1}>
            {schoolName}
          </Text>
          <Text style={[TextScale.caption, { color: colors.inkSoft }]} numberOfLines={1}>
            {t('home.goodMorning', { name: firstName })}
          </Text>
        </View>
      </View>

      {/* Right: staff avatar + theme toggle + bell */}
      <View style={styles.right}>
        <Avatar name={staffName} size={36} />
        <IconBtn
          icon={dark ? 'moon' : 'sun'}
          onPress={onToggleTheme}
          label={dark ? 'moon' : 'sun'}
          color={colors.inkSoft}
        />
        {onPressBell && (
          <View>
            <IconBtn
              icon="bell"
              onPress={onPressBell}
              label="bell"
              color={colors.inkSoft}
            />
            {notifications !== undefined && notifications > 0 && (
              <View
                style={[styles.badge, { backgroundColor: colors.danger }]}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  textBlock: {
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
