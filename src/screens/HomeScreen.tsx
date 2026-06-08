// src/screens/HomeScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDashboard } from '@/features/dashboard/hooks';
import {
  Header,
  HeroTodayCard,
  StatTrio,
  RoleSpecializedCard,
  TasksPeek,
  AlertCard,
  Skeleton,
} from '@/components/ui';
import { ErrorState } from '@/components/state';

export const HomeScreen = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation();
  const { colors, dark, toggleDark, role } = useTheme();
  const { session } = useAuth();
  const { data: d, isLoading, isError, refetch } = useDashboard();

  const openAttendance = () => navigation.navigate('Attendance');

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
        <View style={styles.skeletonContainer}>
          {/* Header placeholder */}
          <Skeleton width="60%" height={24} radius={8} style={styles.skeletonItem} />
          <Skeleton width="40%" height={16} radius={8} style={styles.skeletonItem} />
          {/* Card placeholders */}
          <Skeleton width="100%" height={140} radius={16} style={styles.skeletonItem} />
          <Skeleton width="100%" height={100} radius={16} style={styles.skeletonItem} />
          <Skeleton width="100%" height={120} radius={16} style={styles.skeletonItem} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
        <ErrorState onRetry={refetch} />
      </SafeAreaView>
    );
  }

  if (!d || !session) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Header
          schoolName={session.tenant.name}
          firstName={session.user.firstName}
          staffName={session.user.name}
          dark={dark}
          onToggleTheme={toggleDark}
        />
        <HeroTodayCard
          timing={session.user.timing}
          dutyPostLabel={t('home.dutyPostLabel')}
          dutyPost={session.user.dutyPost}
          checkedIn={false}
          onPressCheckIn={openAttendance}
        />
        <StatTrio
          hoursThisWeek={d.hoursThisWeek}
          hoursTarget={d.hoursTarget}
          streakDays={d.streakDays}
          leaveLeft={d.leaveLeft}
        />
        <RoleSpecializedCard
          roleCard={d.roleCard}
          accent={role.accent}
        />
        <TasksPeek
          tasks={d.pendingTasksPeek}
          onViewAll={() => {}}
        />
        {d.alert && <AlertCard message={d.alert} />}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    gap: 12,
  },
  skeletonContainer: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  skeletonItem: {
    marginBottom: 4,
  },
});
