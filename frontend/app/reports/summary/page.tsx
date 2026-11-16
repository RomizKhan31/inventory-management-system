'use client';

import React from 'react';
import { ModulePageContainer } from '@/src/components/layout/ModulePageContainer';

export default function SummaryTrendsPage() {
  return (
    <ModulePageContainer
      title="Summary & Operational Trends"
      category="Analytics"
      description="Date-filtered volume throughput totals, daily run-rate statistics, and graphical bar/line movement trends."
      allowedRoles={['ADMIN', 'REPORT_VIEWER']}
      scheduledDay="Day 8 of 10"
      badgeColor="slate"
    />
  );
}
