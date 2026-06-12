import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { useTasks, useCompleteTask } from '@/features/tasks/hooks';
import { Card, IconBtn, Pill, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/state';
import { TextScale } from '@/theme/typography';

export const TasksScreen = () => {
  const { t } = useTranslation();
  const { colors, role } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useTasks();
  const complete = useCompleteTask();

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
        <View style={styles.body}><Skeleton width="100%" height={72} radius={16} /><Skeleton width="100%" height={72} radius={16} /></View>
      </SafeAreaView>
    );
  }
  if (isError) {
    return <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}><ErrorState onRetry={refetch} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
      <Text style={[TextScale.screenTitle, styles.title, { color: colors.ink }]}>{t('nav.tasks')}</Text>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 120 }]}>
        {data?.map((task) => (
          <Card key={task.id}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={[TextScale.body, { color: task.done ? colors.inkFaint : colors.ink, textDecorationLine: task.done ? 'line-through' : 'none' }]}>
                  {task.title}
                </Text>
                {task.dueLabel ? <Text style={[TextScale.caption, { color: colors.inkSoft }]}>{task.dueLabel}</Text> : null}
              </View>
              {task.priority === 'urgent' && !task.done ? (
                <Pill label={t('tasks.urgent')} color={colors.danger} bg={colors.dangerSoft} icon="alert" />
              ) : null}
              {task.done ? (
                <View testID={`task-done-${task.id}`}>
                  <Pill label={t('tasks.done')} color={colors.success} bg={colors.successSoft} icon="check" />
                </View>
              ) : (
                <IconBtn testID={`task-complete-${task.id}`} icon="check" label={t('tasks.complete')} color="#FFFFFF" bg={role.accent} onPress={() => complete.mutate(task.id)} />
              )}
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  title: { paddingHorizontal: 16, paddingTop: 12 },
  body: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, gap: 2 },
});
