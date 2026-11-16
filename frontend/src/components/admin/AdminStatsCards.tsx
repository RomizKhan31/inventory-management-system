'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/src/lib/api';
import { IMasterStats } from '@/src/types/admin';
import { ApiResponse } from '@/src/types/api';

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
      icon: '📦',
      color: 'sky',
    },
    {
      title: 'Components',
      total: stats.components.total,
      active: stats.components.active,
      icon: '🧩',
      color: 'emerald',
    },
    {
      title: 'Receive Bays',
      total: stats.receivePoints.total,
      active: stats.receivePoints.active,
      icon: '📥',
      color: 'amber',
    },
    {
      title: 'Delivery Docks',
      total: stats.deliveryPoints.total,
      active: stats.deliveryPoints.active,
      icon: '📤',
      color: 'indigo',
    },
    {
      title: 'Operators',
      total: stats.users.total,
      active: stats.users.active,
      icon: '👥',
      color: 'purple',
    },
    {
      title: 'Audit Logs',
      total: stats.auditLogs.total,
      active: stats.auditLogs.total,
      icon: '📜',
      color: 'slate',
      isSingle: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div
          key={c.title}
          className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">{c.title}</span>
            <span>{c.icon}</span>
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
      ))}
    </div>
  );
};
