'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/src/lib/api';
import { IMasterStats } from '@/src/types/admin';
import { ApiResponse } from '@/src/types/api';
import { Package, Cpu, ArrowDownToLine, ArrowUpFromLine, Users, FileText } from 'lucide-react';

export const AdminStatsCards = () => {
  const [stats, setStats] = useState<IMasterStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const res = await api.get<ApiResponse<IMasterStats>>('/master/stats');
        if (isMounted && res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Failed to load master statistics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-xl border border-slate-200"></div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      title: 'Products',
      total: stats.products.total,
      active: stats.products.active,
      icon: Package,
      color: 'text-sky-600 bg-sky-50',
    },
    {
      title: 'Components',
      total: stats.components.total,
      active: stats.components.active,
      icon: Cpu,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      title: 'Receive Bays',
      total: stats.receivePoints.total,
      active: stats.receivePoints.active,
      icon: ArrowDownToLine,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      title: 'Delivery Docks',
      total: stats.deliveryPoints.total,
      active: stats.deliveryPoints.active,
      icon: ArrowUpFromLine,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      title: 'Operators',
      total: stats.users.total,
      active: stats.users.active,
      icon: Users,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      title: 'Audit Logs',
      total: stats.auditLogs.total,
      active: stats.auditLogs.total,
      icon: FileText,
      color: 'text-slate-600 bg-slate-100',
      isSingle: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.title}
            className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-1.5"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{c.title}</span>
              <div className={`p-1 rounded-md ${c.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-black text-slate-900">{c.total}</span>
              {!c.isSingle && (
                <span className="text-[10px] text-emerald-600 font-semibold">
                  ({c.active} active)
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
