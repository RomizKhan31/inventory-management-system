'use client';

import React from 'react';
import { ModulePageContainer } from '@/src/components/layout/ModulePageContainer';

export default function ProductReceivingPage() {
  return (
    <ModulePageContainer
      title="Product Receiving Bay"
      category="Operations"
      description="Validate component tracking prerequisites and admit finished goods into inventory stock at authorized warehouse receiving points."
      allowedRoles={['ADMIN', 'RECEIVE_USER']}
      scheduledDay="Day 5 of 10"
      badgeColor="emerald"
    />
  );
}
