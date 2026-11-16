'use client';

import React from 'react';
import { ModulePageContainer } from '@/src/components/layout/ModulePageContainer';

export default function ProductDeliveryPage() {
  return (
    <ModulePageContainer
      title="Product Delivery Dock"
      category="Operations"
      description="Verify stock availability in real-time, validate outbound dock assignment, and dispatch serialized products."
      allowedRoles={['ADMIN', 'DELIVERY_USER']}
      scheduledDay="Day 6 of 10"
      badgeColor="amber"
    />
  );
}
