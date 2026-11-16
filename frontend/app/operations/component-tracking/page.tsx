'use client';

import React from 'react';
import { ModulePageContainer } from '@/src/components/layout/ModulePageContainer';

export default function ComponentTrackingPage() {
  return (
    <ModulePageContainer
      title="Component Tracking Station"
      category="Operations"
      description="Scan finished product chassis barcode and bind serialized sub-assembly component barcodes prior to warehouse intake."
      allowedRoles={['ADMIN', 'COMPONENT_TRACKER']}
      scheduledDay="Day 4 of 10"
      badgeColor="sky"
    />
  );
}
