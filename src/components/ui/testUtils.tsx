// src/components/ui/testUtils.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

export function renderWithTheme(ui: React.ReactElement) {
  return render(ui, { wrapper: Wrapper });
}
