// src/components/ui/TasksPeek.tsx
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { SectionLabel } from './SectionLabel';
import { Icon } from '@/components/icons';
import type { TaskPeek } from '@/data/domain';

export interface TasksPeekProps {
  tasks: TaskPeek[];
  onViewAll: () => void;
  onAttachPhoto?: (taskId: string) => void;
}

export const TasksPeek: React.FC<TasksPeekProps> = ({ tasks, onViewAll, onAttachPhoto }) => {
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
        {tasks.length === 0 && (
          <Text style={[TextScale.caption, { color: colors.inkFaint }]}>{t('home.noTasks')}</Text>
        )}
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
            {onAttachPhoto && (
              task.photoUrl ? (
                <View testID={`task-photo-thumb-${task.id}`} style={styles.thumbWrap}>
                  <Image source={{ uri: task.photoUrl }} style={styles.thumb} />
                  <View style={[styles.thumbCheck, { backgroundColor: colors.success, borderColor: colors.bg }]}>
                    <Icon name="check" size={8} color="#FFFFFF" />
                  </View>
                </View>
              ) : (
                <Pressable
                  testID={`task-photo-btn-${task.id}`}
                  accessibilityLabel={t('home.attachPhoto')}
                  onPress={() => onAttachPhoto(task.id)}
                  style={[styles.camBtn, { borderColor: colors.line, backgroundColor: colors.surface }]}
                >
                  <Icon name="camera" size={15} color={colors.inkSoft} />
                </Pressable>
              )
            )}
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
  camBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  thumbWrap: {
    width: 32,
    height: 32,
    flexShrink: 0,
  },
  thumb: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  thumbCheck: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
