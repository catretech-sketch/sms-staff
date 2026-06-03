import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { useLogin } from '@/features/auth/hooks';

export const LoginScreen = () => {
  const { colors, role, roleKey } = useTheme();
  const login = useLogin();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.center}>
        <Text style={[TextScale.hero, { color: colors.ink }]}>SchoolMate Staff</Text>
        <Pressable
          onPress={() => login.mutate({ phone: '98765 43210', roleKey })}
          disabled={login.isPending}
          style={[styles.btn, { backgroundColor: role.accent, opacity: login.isPending ? 0.7 : 1 }]}
          testID="signin"
        >
          {login.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[TextScale.button, { color: '#FFFFFF' }]}>Enter app</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  btn: { height: 54, paddingHorizontal: 28, borderRadius: 16, alignItems: 'center', justifyContent: 'center', minWidth: 200 },
});
