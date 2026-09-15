import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { IssuesScreen } from '@/screens/IssuesScreen';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('@/features/trip/hooks', () => ({
  ...jest.requireActual('@/features/trip/hooks'),
  useCurrentTrip: () => ({ data: null, isLoading: false }),
}));

const mockCreate = jest.fn(async (req: unknown) => ({ id: 'i1', status: 'open', createdAt: '2026-09-15T08:00:00Z', ...(req as object) }));
jest.mock('@/features/issues/hooks', () => ({
  useIssues: () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn() }),
  useReportIssue: () => ({ mutateAsync: mockCreate, isPending: false }),
}));

function renderIssues() {
  return render(<AppProviders><IssuesScreen /></AppProviders>);
}

beforeEach(() => {
  mockCreate.mockClear();
});

it('submits a report with the entered fields', async () => {
  const { getByTestId, getByText, findByTestId } = renderIssues();
  await findByTestId('issue-title');
  fireEvent.changeText(getByTestId('issue-title'), 'Loose seatbelt');
  fireEvent.changeText(getByTestId('issue-description'), 'Row 3 seatbelt is broken.');
  fireEvent.press(getByTestId('issue-category-safety'));
  fireEvent.press(getByTestId('issue-priority-high'));
  fireEvent.press(getByTestId('issue-submit'));
  await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({
    category: 'safety',
    title: 'Loose seatbelt',
    description: 'Row 3 seatbelt is broken.',
    priority: 'high',
  }));
  expect(getByText('Report submitted')).toBeTruthy();
});

it('shows a validation message when required fields are empty', async () => {
  const { getByTestId, getByText, findByTestId } = renderIssues();
  await findByTestId('issue-submit');
  fireEvent.press(getByTestId('issue-submit'));
  await waitFor(() => expect(getByText('Please fill in all required fields')).toBeTruthy());
  expect(mockCreate).not.toHaveBeenCalled();
});

it('shows an empty state when there are no past reports', async () => {
  const { getByText } = renderIssues();
  await waitFor(() => expect(getByText('No reports yet')).toBeTruthy());
});
