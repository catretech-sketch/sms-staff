// src/components/ui/TabBar.tsx
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Icon } from '@/components/icons';
import type { IconName } from '@/components/icons';

export interface TabBarProps {
  state: any;
  navigation: any;
  descriptors: any;
  onPressFab: () => void;
}

// Icon names for the 4 tabs
const TAB_ICONS: Record<string, IconName> = {
  Home: 'home',
  Leave: 'gift',
  Tasks: 'tasks',
  Me: 'user',
};

const FAB_SIZE = 60;
const BAR_HEIGHT = 64;
const BAR_MARGIN_BOTTOM = 26;
const BAR_SIDE_INSET = 14;
const BAR_RADIUS = 26;

export const TabBar: React.FC<TabBarProps> = ({ state, navigation, descriptors, onPressFab }) => {
  const { colors, role } = useTheme();
  const insets = useSafeAreaInsets();

  const routes: { key: string; name: string }[] = state.routes;
  const activeIndex: number = state.index;

  // Split routes into left and right halves around the center FAB
  const leftRoutes = routes.slice(0, 2);
  const rightRoutes = routes.slice(2);

  const handleTabPress = (route: { key: string; name: string }, index: number) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const renderTab = (route: { key: string; name: string }, index: number) => {
    const isFocused = index === activeIndex;
    const iconName = TAB_ICONS[route.name] ?? 'home';
    const iconColor = isFocused ? role.accent : colors.inkFaint;
    const label = descriptors[route.key]?.options.tabBarAccessibilityLabel ?? route.name;

    return (
      <Pressable
        key={route.key}
        testID={`tab-${route.name}`}
        onPress={() => handleTabPress(route, index)}
        style={styles.tab}
        accessibilityRole="button"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={label}
      >
        <Icon
          name={iconName}
          size={24}
          color={iconColor}
          strokeWidth={isFocused ? 2.5 : 2}
        />
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.outerContainer,
        { paddingBottom: insets.bottom + BAR_MARGIN_BOTTOM },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface,
            shadowColor: colors.inkFaint,
            borderColor: colors.line,
          },
        ]}
      >
        {/* Left tabs */}
        <View style={styles.tabSection}>
          {leftRoutes.map((route, i) => renderTab(route, i))}
        </View>

        {/* Center FAB spacer */}
        <View style={styles.fabSpacer} />

        {/* Right tabs */}
        <View style={styles.tabSection}>
          {rightRoutes.map((route, i) => renderTab(route, i + 2))}
        </View>
      </View>

      {/* Center FAB — floats above the bar, centered on bar's top edge */}
      <Pressable
        testID="tab-fab"
        onPress={onPressFab}
        style={[
          styles.fab,
          {
            backgroundColor: role.accent,
            bottom: insets.bottom + BAR_MARGIN_BOTTOM + BAR_HEIGHT - FAB_SIZE / 2,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Check in"
      >
        <Icon name="plus" size={28} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: BAR_SIDE_INSET,
    right: BAR_SIDE_INSET,
    alignItems: 'center',
    // Let touches pass through the transparent area
  },
  bar: {
    width: '100%',
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    // Elevation (Android)
    elevation: 12,
    // Shadow (iOS)
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  tabSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
    minWidth: 44,
  },
  fabSpacer: {
    width: FAB_SIZE + 16,
  },
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Elevation (Android)
    elevation: 16,
    // Shadow (iOS)
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
});
