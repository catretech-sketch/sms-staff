// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

import React from 'react';
import { act } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { Confetti, type ConfettiHandle } from '@/components/ui';

it('renders without crashing and exposes fire() via ref', () => {
  const ref = React.createRef<ConfettiHandle>();
  const { toJSON } = renderWithTheme(<Confetti ref={ref} />);
  act(() => {
    ref.current?.fire();
  });
  expect(toJSON()).toBeTruthy();
});
