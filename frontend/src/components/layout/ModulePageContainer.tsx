'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { UserRole } from '@/src/types/auth';
import { useAuth } from '@/src/context/AuthContext';
import { Shield } from 'lucide-react';

interface ModulePageContainerProps {
  title: string;
  category: 'Operations' | 'Analytics' | 'Administration';
  description: string;
  allowedRoles: UserRole[];
  scheduledDay: string;
  badgeColor?: 'sky' | 'emerald' | 'amber' | 'purple' | 'slate';
  children?: ReactNode;
}

export const ModulePageContainer = ({
  title,
  category,
  description,
  allowedRoles,
  scheduledDay,
  badgeColor = 'sky',
  children,
}: ModulePageContainerProps) => {
  const { user } = useAuth();

  const colorStyles: Record<string, { bg: string; text: string; border: string }> = {
    sky: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  };

  const style = colorStyles[badgeColor] || colorStyles.sky;

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="space-y-6">
        {/* Module Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {category}
                </span>
                <span className="text-slate-300">•</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                  {scheduledDay}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">{description}</p>
            </div>

            <div className="flex flex-col sm:items-end space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Security Clearance</span>
              <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-2.5 py-1 rounded-lg font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Authorized: {user?.role}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">User ID: {user?.userCode}</span>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-700">Permitted Roles:</span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                {allowedRoles.join(', ')}
              </span>
            </div>

            <Link
              href="/"
              className="text-xs text-sky-600 hover:text-sky-800 font-semibold flex items-center space-x-1"
            >
              <span>&larr; Back to Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Content Area or Stub Preview */}
        {children ? (
          <div>{children}</div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto shadow-xs">
              <Shield className="w-6 h-6 text-sky-600" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-slate-900">RBAC Gate Verified</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Role authorization check passed for role <span className="font-mono font-bold text-slate-700">[{user?.role}]</span>.
                The full operational barcode scanning workflow and data tables will be wired during <span className="font-bold text-slate-700">{scheduledDay}</span>.
              </p>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};
