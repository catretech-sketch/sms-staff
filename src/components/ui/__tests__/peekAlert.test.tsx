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

  it('shows a camera button per task and fires onAttachPhoto with that task id', () => {
    const onAttachPhoto = jest.fn();
    const { getByTestId } = renderWithTheme(
      <TasksPeek tasks={tasks} onViewAll={jest.fn()} onAttachPhoto={onAttachPhoto} />,
    );
    fireEvent.press(getByTestId('task-photo-btn-t1'));
    expect(onAttachPhoto).toHaveBeenCalledWith('t1');
  });

  it('shows a thumbnail instead of the camera button once a task has a photo', () => {
    const withPhoto: TaskPeek[] = [
      { id: 't1', title: 'Pre-trip bus inspection', priority: 'urgent', done: false, photoUrl: 'data:image/jpeg;base64,abc' },
    ];
    const { getByTestId, queryByTestId } = renderWithTheme(
      <TasksPeek tasks={withPhoto} onViewAll={jest.fn()} onAttachPhoto={jest.fn()} />,
    );
    expect(getByTestId('task-photo-thumb-t1')).toBeTruthy();
    expect(queryByTestId('task-photo-btn-t1')).toBeNull();
  });

  it('does not render camera buttons when onAttachPhoto is not provided', () => {
    const { queryByTestId } = renderWithTheme(
      <TasksPeek tasks={tasks} onViewAll={jest.fn()} />,
    );
    expect(queryByTestId('task-photo-btn-t1')).toBeNull();
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
