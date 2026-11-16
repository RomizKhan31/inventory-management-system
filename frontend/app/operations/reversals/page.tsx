'use client';

import React from 'react';
import { ModulePageContainer } from '@/src/components/layout/ModulePageContainer';

export default function ReversalsPage() {
  return (
    <ModulePageContainer
      title="Transaction Reversals & Corrections"
      category="Operations"
      description="Administrative correction terminal for reversing erroneous transactions with strict audit reasons and state recalculation."
      allowedRoles={['ADMIN']}
      scheduledDay="Day 7 of 10"
      badgeColor="purple"
    />
  );
}
