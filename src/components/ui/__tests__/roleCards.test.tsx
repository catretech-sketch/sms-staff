import React from 'react';
import { renderWithTheme } from '../testUtils';
import { RoleSpecializedCard } from '@/components/ui';
import type { RoleCard } from '@/data/domain';

const cases: [RoleCard, RegExp][] = [
  [{ kind: 'driver', busNo: 'HR-26-BX-4412', routeName: 'Route 7', shift: '7:00 AM - 4:00 PM', studentsAssigned: 24 }, /HR-26-BX-4412/],
  [{ kind: 'conductor', busNo: 'HR-26-BX-4412', routeName: 'Route 7', shift: '7:00 AM - 4:00 PM', studentsAssigned: 24 }, /Route 7/],
  [{ kind: 'guard', gate: 'Main Gate', roundsDone: 3, roundsTotal: 6, visitorsToday: 14 }, /Main Gate/],
  [{ kind: 'gardener', zones: ['Front lawn'], wateringDue: 2 }, /Front lawn/],
  [{ kind: 'sweeper', blocks: ['Block A'], suppliesLow: ['Phenyl'] }, /Block A/],
  [{ kind: 'peon', errands: 4, bellDuty: true }, /4/],
];

it.each(cases)('renders %s card', (roleCard, re) => {
  const { getByText } = renderWithTheme(<RoleSpecializedCard roleCard={roleCard} accent="#E08A3C" />);
  expect(getByText(re)).toBeTruthy();
});
