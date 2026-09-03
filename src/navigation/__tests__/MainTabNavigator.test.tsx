import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme';
import { MainTabNavigator } from '@/navigation/MainTabNavigator';

jest.mock('@/screens/HomeScreen', () => ({ HomeScreen: () => null }));
jest.mock('@/screens/LeaveScreen', () => ({ LeaveScreen: () => null }));
jest.mock('@/screens/TasksScreen', () => ({ TasksScreen: () => null }));
jest.mock('@/screens/ProfileScreen', () => ({ ProfileScreen: () => null }));
jest.mock('@/screens/AttendanceScreen', () => ({ AttendanceScreen: () => null }));
jest.mock('@/screens/TripScreen', () => ({ TripScreen: () => null }));
jest.mock('@/screens/LiveMapScreen', () => ({ LiveMapScreen: () => null }));

describe('MainTabNavigator', () => {
  it('renders without crashing now that LiveMap is registered', () => {
    expect(() =>
      render(
        <SafeAreaProvider>
          <ThemeProvider>
            <NavigationContainer>
              <MainTabNavigator />
            </NavigationContainer>
          </ThemeProvider>
        </SafeAreaProvider>
      )
    ).not.toThrow();
  });
});
