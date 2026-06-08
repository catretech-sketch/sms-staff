// src/components/ui/__tests__/peekAlert.test.tsx
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { TasksPeek, AlertCard } from '@/components/ui';
import type { TaskPeek } from '@/data/domain';

const tasks: TaskPeek[] = [
  { id: 't1', title: 'Pre-trip bus inspection', priority: 'urgent', done: false },
  { id: 't2', title: 'Submit fuel log', priority: 'normal', done: false },
];

describe('TasksPeek', () => {
  it('renders each task title and fires onViewAll', () => {
    const onViewAll = jest.fn();
    const { getByText } = renderWithTheme(
      <TasksPeek tasks={tasks} onViewAll={onViewAll} />,
    );
    expect(getByText('Pre-trip bus inspection')).toBeTruthy();
    expect(getByText('Submit fuel log')).toBeTruthy();
    fireEvent.press(getByText('View all'));
    expect(onViewAll).toHaveBeenCalled();
  });
});

describe('AlertCard', () => {
  it('renders its message', () => {
    const { getByText } = renderWithTheme(
      <AlertCard message="Staff meeting at 4:00 PM" />,
    );
    expect(getByText('Staff meeting at 4:00 PM')).toBeTruthy();
  });
});
