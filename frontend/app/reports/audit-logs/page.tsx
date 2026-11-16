'use client';

import React from 'react';
import { ModulePageContainer } from '@/src/components/layout/ModulePageContainer';

export default function AuditLogsPage() {
  return (
    <ModulePageContainer
      title="System Audit & Security Logs"
      category="Analytics"
      description="Administrative security audit log records, authentication events, IP addresses, and master catalog changes."
      allowedRoles={['ADMIN']}
      scheduledDay="Day 8 of 10"
      badgeColor="purple"
    />
  );
}
