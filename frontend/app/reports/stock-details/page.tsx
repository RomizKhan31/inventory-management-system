'use client';

import React from 'react';
import { ModulePageContainer } from '@/src/components/layout/ModulePageContainer';

export default function StockDetailsPage() {
  return (
    <ModulePageContainer
      title="Stock Details by Location"
      category="Analytics"
      description="Real-time multi-dimensional inventory balances aggregated by product model and warehouse receive points."
      allowedRoles={['ADMIN', 'REPORT_VIEWER']}
      scheduledDay="Day 8 of 10"
      badgeColor="slate"
    />
  );
}
