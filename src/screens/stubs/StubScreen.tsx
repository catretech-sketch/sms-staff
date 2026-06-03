import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';

export const StubScreen: React.FC<{ title: string }> = ({ title }) => {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.center}>
        <Text style={[TextScale.screenTitle, { color: colors.ink }]}>{title}</Text>
        <Text style={[TextScale.body, { color: colors.inkSoft, marginTop: 8 }]}>
          Coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
