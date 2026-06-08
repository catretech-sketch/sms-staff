import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/screens/LoginScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { useAuth } from '@/features/auth/AuthProvider';
import { SplashScreen } from '@/screens/SplashScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { status } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  // While auth is resolving, show the Splash with a no-op onDone so it
  // keeps animating without advancing until auth status is known.
  if (status === 'loading') {
    return <SplashScreen onDone={() => {}} />;
  }

  // Show Splash once per cold start before Login.
  if (status !== 'authenticated' && !splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
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

