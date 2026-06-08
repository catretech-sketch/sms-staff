// src/components/icons/__tests__/Icon.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Icon, ICON_NAMES } from '@/components/icons';

describe('Icon', () => {
  it('renders a known icon with an accessibility label', () => {
    const { getByLabelText } = render(<Icon name="bus" size={24} color="#000" />);
    expect(getByLabelText('bus')).toBeTruthy();
  });

  it('exposes every role + ui name used by the app', () => {
    for (const n of ['bus','pot','shield','leaf','broom','bell','doc','home','check','globe','phone','sun','moon','mapPin','radar']) {
      expect(ICON_NAMES).toContain(n);
    }
  });
});
