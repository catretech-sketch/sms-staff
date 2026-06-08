import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/screens/LoginScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/theme';
import { SplashScreen } from '@/screens/SplashScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { status } = useAuth();
  const { colors } = useTheme();
  const [splashDone, setSplashDone] = useState(false);

  // Show the Splash first, with a real advance callback from the very first
  // render. Auth bootstraps in the background. Passing a no-op here (as we did
  // while status was 'loading') tripped the Splash's fire-once guard and wedged
  // the app on the Splash forever — so never do that.
  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }

  // Splash finished but auth hasn't resolved yet (bootstrap is normally <100ms).
  if (status === 'loading') {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {status === 'authenticated' ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

