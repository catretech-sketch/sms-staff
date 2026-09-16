// src/components/ui/roleCards/RoleSpecializedCard.tsx
import React from 'react';
import type { RoleCard } from '@/data/domain';
import { DriverCard } from './DriverCard';
import { ConductorCard } from './ConductorCard';
import { GuardCard } from './GuardCard';
import { GardenerCard } from './GardenerCard';
import { SweeperCard } from './SweeperCard';
import { PeonCard } from './PeonCard';

export interface RoleSpecializedCardProps {
  roleCard: RoleCard | null;
  accent: string;
  onViewDetails?: () => void;
}

export const RoleSpecializedCard: React.FC<RoleSpecializedCardProps> = ({ roleCard, accent, onViewDetails }) => {
  if (roleCard === null) return null;
  switch (roleCard.kind) {
    case 'driver':
      return (
        <DriverCard
          busNo={roleCard.busNo}
          routeName={roleCard.routeName}
          shift={roleCard.shift}
          studentsAssigned={roleCard.studentsAssigned}
          accent={accent}
          onViewDetails={onViewDetails ?? (() => {})}
        />
      );
    case 'conductor':
      return (
        <ConductorCard
          busNo={roleCard.busNo}
          routeName={roleCard.routeName}
          shift={roleCard.shift}
          studentsAssigned={roleCard.studentsAssigned}
          accent={accent}
          onViewDetails={onViewDetails ?? (() => {})}
        />
      );
    case 'guard':
      return (
        <GuardCard
          gate={roleCard.gate}
          roundsDone={roleCard.roundsDone}
          roundsTotal={roleCard.roundsTotal}
          visitorsToday={roleCard.visitorsToday}
          accent={accent}
        />
      );
    case 'gardener':
      return (
        <GardenerCard
          zones={roleCard.zones}
          wateringDue={roleCard.wateringDue}
          accent={accent}
        />
      );
    case 'sweeper':
      return (
        <SweeperCard
          blocks={roleCard.blocks}
          suppliesLow={roleCard.suppliesLow}
          accent={accent}
        />
      );
    case 'peon':
      return (
        <PeonCard
          errands={roleCard.errands}
          bellDuty={roleCard.bellDuty}
          accent={accent}
        />
      );
    default: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustive: never = roleCard;
      return null;
    }
  }
};
