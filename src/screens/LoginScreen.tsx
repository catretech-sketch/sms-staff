import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';

export const LoginScreen: React.FC<{ onSignIn: () => void }> = ({ onSignIn }) => {
  const { colors, role } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.center}>
        <Text style={[TextScale.hero, { color: colors.ink }]}>SchoolMate Staff</Text>
        <Pressable
          onPress={onSignIn}
          style={[styles.btn, { backgroundColor: role.accent }]}
          testID="signin"
        >
          <Text style={[TextScale.button, { color: '#FFFFFF' }]}>Enter app</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  btn: { height: 54, paddingHorizontal: 28, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
