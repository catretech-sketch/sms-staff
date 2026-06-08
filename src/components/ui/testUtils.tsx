// src/components/ui/testUtils.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';

export function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}
