'use client';

import React from 'react';
import { ModulePageContainer } from '@/src/components/layout/ModulePageContainer';

export default function MasterDataAdminPage() {
  return (
    <ModulePageContainer
      title="Master Data Catalogs Management"
      category="Administration"
      description="Define and manage industrial finished products, required sub-assemblies, receive points, and delivery dock configurations."
      allowedRoles={['ADMIN']}
      scheduledDay="Day 9 of 10"
      badgeColor="purple"
    />
  );
}
