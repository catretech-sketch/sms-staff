// src/components/ui/TasksPeek.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { SectionLabel } from './SectionLabel';
import type { TaskPeek } from '@/data/domain';

export interface TasksPeekProps {
  tasks: TaskPeek[];
  onViewAll: () => void;
}

export const TasksPeek: React.FC<TasksPeekProps> = ({ tasks, onViewAll }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <SectionLabel
        title={t('home.pendingTasks')}
        actionLabel={t('common.viewAll')}
        onAction={onViewAll}
      />
      <View style={styles.list}>
        {tasks.map((task) => (
          <View
            key={task.id}
            style={[styles.taskRow, { borderBottomColor: colors.line }]}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    task.priority === 'urgent' ? colors.danger : colors.inkFaint,
                },
              ]}
            />
            <Text style={[TextScale.body, { color: colors.ink, flex: 1 }]}>
              {task.title}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  list: {
    gap: 0,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
});
