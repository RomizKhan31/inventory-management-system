'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { getGroupedNavForRole, NavItem } from '@/src/config/navigation';

export const AppHeader = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeMenus = () => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
  };

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

  const groupedNav = isAuthenticated && user ? getGroupedNavForRole(user.role) : {};
  const categories = Object.keys(groupedNav);

  return (
    <>
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-xs" ref={navRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                W
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-lg leading-tight">
                  WALTON <span className="font-normal text-slate-500">| IMS</span>
                </h1>
                <p className="text-[10px] text-slate-500 font-medium">
                  Barcode Inventory Tracking
                </p>
              </div>
            </Link>

            {/* Desktop Role-Aware Navigation Bar */}
            {isAuthenticated && user && (
              <nav className="hidden lg:flex items-center space-x-1 pl-4 border-l border-slate-200">
                {user.role === 'ADMIN' ? (
                  // Admin: Categorized Dropdowns
                  categories.map((cat) => {
                    const items = groupedNav[cat];
                    const isCurrentCategoryActive = items.some((item) => pathname.startsWith(item.href));
                    const isOpen = activeDropdown === cat;

                    return (
                      <div key={cat} className="relative">
                        <button
                          onClick={() => setActiveDropdown(isOpen ? null : cat)}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
                            isCurrentCategoryActive
                              ? 'bg-sky-50 text-sky-700 font-bold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <span>{cat}</span>
                          <span className="text-[9px] text-slate-400">▼</span>
                        </button>

                        {isOpen && (
                          <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                              {cat} Modules
                            </div>
                            {items.map((item: NavItem) => {
                              const isActive = pathname === item.href;
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={closeMenus}
                                  className={`block px-3 py-2 text-xs transition-colors ${
                                    isActive
                                      ? 'bg-sky-50 text-sky-700 font-bold'
                                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                  }`}
                                >
                                  <div className="font-semibold">{item.name}</div>
                                  {item.description && (
                                    <div className="text-[11px] text-slate-400 font-normal leading-tight mt-0.5">
                                      {item.description}
                                    </div>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // Non-Admin: Direct Action Links For Single Authorized Role
                  categories.map((cat) =>
                    groupedNav[cat].map((item: NavItem) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeMenus}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-sky-100 text-sky-800 font-bold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          {item.name}
                        </Link>
                      );
                    })
                  )
                )}
              </nav>
            )}
          </div>

          {/* Right Navigation & User Controls */}
          <div className="flex items-center space-x-3 text-sm">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                pathname === '/' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Dashboard
            </Link>

            <a
              href="http://localhost:5000/api/v1/health"
              target="_blank"
              rel="noreferrer"
              className="hidden md:flex px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs transition-colors items-center space-x-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span>API Health</span>
            </a>

            {isAuthenticated && user ? (
              <div className="flex items-center space-x-2 sm:space-x-3 pl-3 border-l border-slate-200">
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
                  🔑
                </button>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                >
                  Sign Out
                </button>

                {/* Mobile Menu Toggle Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                  aria-label="Toggle Navigation Menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
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

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && isAuthenticated && user && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-3 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-900">{user.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">Role: {user.role}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadgeClass(user.role)}`}>
                {user.role}
              </span>
            </div>

            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat} className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {cat}
                  </div>
                  {groupedNav[cat].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        pathname === item.href
                          ? 'bg-sky-50 text-sky-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
};
