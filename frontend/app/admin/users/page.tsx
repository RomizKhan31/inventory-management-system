'use client';

import React from 'react';
import { ModulePageContainer } from '@/src/components/layout/ModulePageContainer';

export default function UserManagementPage() {
  return (
    <ModulePageContainer
      title="User Management & Single-Role Assignments"
      category="Administration"
      description="Create manufacturing operator accounts, assign exactly one role, and activate or deactivate user credentials."
      allowedRoles={['ADMIN']}
      scheduledDay="Day 9 of 10"
      badgeColor="purple"
    />
  );
}
