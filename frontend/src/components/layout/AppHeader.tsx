'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

export const AppHeader = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'COMPONENT_TRACKER':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'RECEIVE_USER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DELIVERY_USER':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'REPORT_VIEWER':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <>
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Title */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              W
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg leading-tight">
                WALTON <span className="font-normal text-slate-500">| IMS</span>
              </h1>
              <p className="text-[11px] text-slate-500">
                Discrete Manufacturing Barcode Tracking
              </p>
            </div>
          </Link>

          {/* Right Navigation & User Controls */}
          <div className="flex items-center space-x-3 text-sm">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors text-xs font-medium"
            >
              Dashboard
            </Link>

            <a
              href="http://localhost:5000/api/v1/health"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs transition-colors flex items-center space-x-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span>API Health</span>
            </a>

            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
                {/* User Info & Role Badge */}
                <div className="text-right hidden sm:block">
                  <div className="flex items-center justify-end space-x-1.5">
                    <span className="font-bold text-xs text-slate-900">{user.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadgeClass(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {user.userCode}</p>
                </div>

                {/* Password Change Button */}
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  title="Change Password"
                  className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
                >
                  🔑 Change Password
                </button>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-1.5 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
};
