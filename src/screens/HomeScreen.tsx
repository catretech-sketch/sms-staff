// src/screens/HomeScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDashboard } from '@/features/dashboard/hooks';
import { useAttendanceStatus } from '@/features/attendance/hooks';
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
  const att = useAttendanceStatus();

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
        <Animated.View entering={FadeInDown.delay(0).duration(300)}>
          <HeroTodayCard
            timing={session.user.timing}
            dutyPostLabel={t('home.dutyPostLabel')}
            dutyPost={session.user.dutyPost}
            checkedIn={att.data?.checkedIn ?? false}
            checkInAt={att.data?.checkInAt}
            onPressCheckIn={openAttendance}
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(65).duration(300)}>
          <StatTrio
            hoursThisWeek={d.hoursThisWeek}
            hoursTarget={d.hoursTarget}
            streakDays={d.streakDays}
            leaveLeft={d.leaveLeft}
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(130).duration(300)}>
          <RoleSpecializedCard
            roleCard={d.roleCard}
            accent={role.accent}
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(195).duration(300)}>
          <TasksPeek
            tasks={d.pendingTasksPeek}
            onViewAll={() => {}}
          />
        </Animated.View>
        {d.alert && (
          <Animated.View entering={FadeInDown.delay(260).duration(300)}>
            <AlertCard message={d.alert} />
          </Animated.View>
        )}
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
