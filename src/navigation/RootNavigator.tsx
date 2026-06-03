import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/screens/LoginScreen';
import { MainTabNavigator } from './MainTabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  // Temporary local gate for Plan 1. Replaced by useAuth() in Plan 2.
  const [signedIn, setSignedIn] = useState(false);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {signedIn ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Login">
          {() => <LoginScreen onSignIn={() => setSignedIn(true)} />}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
};
