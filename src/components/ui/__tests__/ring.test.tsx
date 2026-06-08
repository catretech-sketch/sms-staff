// src/components/ui/__tests__/ring.test.tsx
import React from 'react';
import { renderWithTheme } from '../testUtils';
import { Ring } from '@/components/ui';
it('Ring shows its center label', () => {
  const { getByText } = renderWithTheme(<Ring value={34} target={44} label="34" sublabel="of 44" />);
  expect(getByText('34')).toBeTruthy();
});
