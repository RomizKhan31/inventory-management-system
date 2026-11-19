'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, Users, FileText, ShieldCheck } from 'lucide-react';

export const AdminSidebar = () => {
  const pathname = usePathname();

  const links = [
    {
      name: 'Master Catalogs',
      href: '/admin/master-data',
      icon: Package,
      description: 'Products, components, bays & docks',
    },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: Users,
      description: 'Operator accounts & single-role gates',
    },
    {
      name: 'Audit Trail',
      href: '/reports/audit-logs',
      icon: FileText,
      description: 'System-wide immutable change log',
    },
  ];

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-4">
      {/* Navigation Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-2">
        <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Admin Console
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            ADMIN
          </span>
        </div>

        <nav className="space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-start space-x-3 p-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-sky-50 text-sky-900 border border-sky-200/80 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${isActive ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">{link.name}</p>
                  <p className="text-[11px] text-slate-400 font-normal leading-tight mt-0.5">
                    {link.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Industrial Safety Rule Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xs space-y-1.5">
        <div className="flex items-center space-x-1.5 text-sky-400 text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
          <span>Ledger Integrity</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Master records in use are soft-deactivated to guarantee unbroken audit lineage across all transactions.
        </p>
      </div>
    </aside>
  );
};

