import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { HomeScreen } from '@/screens/HomeScreen';
import { LeaveScreen } from '@/screens/LeaveScreen';
import { TasksScreen } from '@/screens/TasksScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { AttendanceScreen } from '@/screens/AttendanceScreen';
import { TripScreen } from '@/screens/TripScreen';
import { LiveMapScreen } from '@/screens/LiveMapScreen';
import { TabBar } from '@/components/ui';
import type { MainStackParamList, MainTabParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Inner bottom-tab navigator using the custom floating TabBar.
// The FAB navigates to 'Attendance' which is a sibling route in the parent
// native-stack — React Navigation v7 bubbles the navigate call up automatically.
const TabsNavigator = () => {
  const navigation = useNavigation();
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <TabBar
          {...props}
          onPressFab={() => navigation.navigate('Attendance' as never)}
        />
      )}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Leave" component={LeaveScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Me" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Exported navigator: a native-stack wrapping the tabs + the Attendance overlay.
export const MainTabNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={TabsNavigator} />
    <Stack.Screen
      name="Attendance"
      component={AttendanceScreen}
      options={{ presentation: 'card', animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="Trip"
      component={TripScreen}
      options={{ presentation: 'card', animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="LiveMap"
      component={LiveMapScreen}
      options={{ presentation: 'card', animation: 'slide_from_right' }}
    />
  </Stack.Navigator>
);
