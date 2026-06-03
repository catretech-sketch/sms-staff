import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { env } from '@/config/env';
import { createHttpClient } from '@/lib/httpClient';
import { authSnapshot } from '@/lib/authSnapshot';
import { createStore } from '@/data/mock/store';
import { createMockRepositories, createHttpRepositories } from '@/data/repositories/factory';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ThemeProvider } from '@/theme';
import type { Repositories } from '@/data/repositories/types';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [repositories, setRepositories] = useState<Repositories | null>(null);

  useEffect(() => {
    (async () => {
      if (env.DATA_SOURCE === 'live') {
        const http = createHttpClient({
          baseUrl: env.API_BASE_URL,
          getAuth: () => authSnapshot.get(),
        });
        setRepositories(createHttpRepositories(http));
      } else {
        const store = await createStore();
        setRepositories(createMockRepositories(store));
      }
    })();
  }, []);

  if (!repositories) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0E5C4A" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RepositoryProvider repositories={repositories}>
          <AuthProvider>{children}</AuthProvider>
        </RepositoryProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2EEE4' },
});
