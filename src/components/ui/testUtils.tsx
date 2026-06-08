// src/components/ui/testUtils.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

export function renderWithTheme(ui: React.ReactElement) {
  return render(ui, { wrapper: Wrapper });
}
