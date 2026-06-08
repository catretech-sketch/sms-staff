import React from 'react';
import { renderWithTheme } from '../testUtils';
import { RoleSpecializedCard } from '@/components/ui';
import type { RoleCard } from '@/data/domain';

const cases: [RoleCard, RegExp][] = [
  [{ kind: 'driver', busNo: 'HR-26-BX-4412', routeName: 'Route 7', licenseExpiresInDays: 24, fitnessOk: true }, /HR-26-BX-4412/],
  [{ kind: 'cook', mealCount: 320, menu: ['Rice'], lowStock: ['Oil'] }, /320/],
  [{ kind: 'guard', gate: 'Main Gate', roundsDone: 3, roundsTotal: 6, visitorsToday: 14 }, /Main Gate/],
  [{ kind: 'gardener', zones: ['Front lawn'], wateringDue: 2 }, /Front lawn/],
  [{ kind: 'sweeper', blocks: ['Block A'], suppliesLow: ['Phenyl'] }, /Block A/],
  [{ kind: 'peon', errands: 4, bellDuty: true }, /4/],
  [{ kind: 'clerk', pendingFiles: 7, requestsOpen: 3 }, /7/],
];

it.each(cases)('renders %s card', (roleCard, re) => {
  const { getByText } = renderWithTheme(<RoleSpecializedCard roleCard={roleCard} accent="#E08A3C" />);
  expect(getByText(re)).toBeTruthy();
});
