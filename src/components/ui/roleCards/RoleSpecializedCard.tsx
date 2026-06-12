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
  roleCard: RoleCard;
  accent: string;
}

export const RoleSpecializedCard: React.FC<RoleSpecializedCardProps> = ({ roleCard, accent }) => {
  switch (roleCard.kind) {
    case 'driver':
      return (
        <DriverCard
          busNo={roleCard.busNo}
          routeName={roleCard.routeName}
          licenseExpiresInDays={roleCard.licenseExpiresInDays}
          fitnessOk={roleCard.fitnessOk}
          accent={accent}
        />
      );
    case 'conductor':
      return (
        <ConductorCard
          routeName={roleCard.routeName}
          onBoard={roleCard.onBoard}
          capacity={roleCard.capacity}
          nextStop={roleCard.nextStop}
          accent={accent}
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
