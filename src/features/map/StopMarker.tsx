import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/icons';
import type { StopRole } from './stopRoles';

export interface StopMarkerProps {
  role: StopRole;
  isDestination: boolean;
}

export const StopMarker: React.FC<StopMarkerProps> = ({ role, isDestination }) => {
  const { colors } = useTheme();

  if (isDestination) {
    return (
      <View testID="stop-marker-destination" style={[styles.destination, { backgroundColor: colors.gold, borderColor: colors.surface }]}>
        <Icon name="home" size={16} color="#FFFFFF" strokeWidth={2} />
      </View>
    );
  }

  if (role === 'completed') {
    return (
      <View testID="stop-marker-completed" style={[styles.small, { backgroundColor: colors.inkFaint, borderColor: colors.surface }]}>
        <Icon name="check" size={10} color="#FFFFFF" strokeWidth={3} />
      </View>
    );
  }

  if (role === 'current') {
    return <View testID="stop-marker-current" style={[styles.large, { backgroundColor: colors.primary, borderColor: colors.surface }]} />;
  }

  if (role === 'next') {
    return <View testID="stop-marker-next" style={[styles.medium, { backgroundColor: colors.surface, borderColor: colors.primary }]} />;
  }

  return <View testID="stop-marker-upcoming" style={[styles.dot, { backgroundColor: colors.inkFaint }]} />;
};

const styles = StyleSheet.create({
  destination: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  large: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
  },
  medium: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
  },
  small: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
