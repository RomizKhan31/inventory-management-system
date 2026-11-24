"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/src/context/AuthContext";
import { useLayout } from "@/src/context/LayoutContext";
import { getGroupedNavForRole, NavItem } from "@/src/config/navigation";
import {
  LayoutDashboard,
  Cpu,
  ArrowDownToLine,
  Truck,
  RotateCcw,
  Package,
  BarChart3,
  ScanBarcode,
  ShieldCheck,
  Database,
  Users,
  KeyRound,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

/**
 * Maps route hrefs to specific professional Lucide icons.
 */
const getNavIcon = (href: string) => {
  switch (href) {
    case "/operations/component-tracking":
      return Cpu;
    case "/operations/receive":
      return ArrowDownToLine;
    case "/operations/delivery":
      return Truck;
    case "/operations/reversals":
      return RotateCcw;
    case "/reports/stock-details":
      return Package;
    case "/reports/summary":
      return BarChart3;
    case "/reports/barcode-history":
      return ScanBarcode;
    case "/reports/audit-logs":
      return ShieldCheck;
    case "/admin/master-data":
      return Database;
    case "/admin/users":
      return Users;
    default:
      return LayoutDashboard;
  }
};

const getRoleBadge = (role: string) => {
  switch (role) {
    case "ADMIN":
      return {
        label: "Administrator",
        className: "bg-purple-50 text-purple-700 border-purple-200",
        avatarBg: "bg-purple-600 text-white",
      };
    case "COMPONENT_TRACKER":
      return {
        label: "Component Tracker",
        className: "bg-sky-50 text-sky-700 border-sky-200",
        avatarBg: "bg-sky-600 text-white",
      };
    case "RECEIVE_USER":
      return {
        label: "Product Receiver",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        avatarBg: "bg-emerald-600 text-white",
      };
    case "DELIVERY_USER":
      return {
        label: "Product Deliverer",
        className: "bg-amber-50 text-amber-700 border-amber-200",
        avatarBg: "bg-amber-600 text-white",
      };
    case "REPORT_VIEWER":
      return {
        label: "Report Viewer",
        className: "bg-indigo-50 text-indigo-700 border-indigo-200",
        avatarBg: "bg-indigo-600 text-white",
      };
    default:
      return {
        label: role,
        className: "bg-slate-100 text-slate-700 border-slate-200",
        avatarBg: "bg-slate-700 text-white",
      };
  }
};

export const AppSidebar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const {
    isSidebarCollapsed,
    toggleSidebar,
    isMobileSidebarOpen,
    toggleMobileSidebar,
    closeMobileSidebar,
    openPasswordModal,
  } = useLayout();
  const pathname = usePathname();
  const router = useRouter();

  if (!isAuthenticated || !user) {
    return null;
  }

  const roleMeta = getRoleBadge(user.role);
  const groupedNav = getGroupedNavForRole(user.role);
  const categories = Object.keys(groupedNav);

  // Extract initials from user's full name (up to 2 letters)
  const initials = user.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const handleLogout = async () => {
    closeMobileSidebar();
    await logout();
    router.push("/login");
  };

  const handleNavClick = () => {
    closeMobileSidebar();
  };

  const handleChangePasswordClick = () => {
    closeMobileSidebar();
    openPasswordModal();
  };

  // Nav item renderer
  const renderNavLink = (item: { name: string; href: string; description?: string }) => {
    const Icon = getNavIcon(item.href);
    const isActive =
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={handleNavClick}
        title={isSidebarCollapsed ? item.name : undefined}
        className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
          isActive
            ? "bg-sky-50 text-sky-700 font-bold border border-sky-200 shadow-2xs"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        } ${isSidebarCollapsed ? "justify-center px-2 py-2.5" : ""}`}
      >
        <div
          className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
            isActive
              ? "bg-sky-600 text-white"
              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
        {!isSidebarCollapsed && (
          <div className="flex-1 truncate">
            <div className="truncate">{item.name}</div>
          </div>
        )}
      </Link>
    );
  };

  // Sidebar Content (shared between Desktop and Mobile)
  const sidebarContent = (
    <div className="flex flex-col h-full select-none">
      {/* 1. Brand Logo Header */}
      <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between">
        {!isSidebarCollapsed ? (
          <Link href="/" onClick={handleNavClick} className="flex items-center space-x-2.5 group">
            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
              <Image
                src="/walton_logo.png"
                alt="Walton Logo"
                width={512}
                height={512}
                className="w-10 h-10 object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-wider text-slate-900 uppercase">
                Inventory System
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Walton Hi-Tech PLC
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/" onClick={handleNavClick} className="mx-auto" title="Walton Inventory System">
            <div className="relative w-9 h-9 flex items-center justify-center">
              <Image
                src="/walton_logo.png"
                alt="Walton Logo"
                width={512}
                height={512}
                className="w-9 h-9 object-contain"
                priority
              />
            </div>
          </Link>
        )}
      </div>

      {/* 2. User Profile Capsule Card */}
      <div className="p-3.5 border-b border-slate-200 bg-linear-to-b from-slate-50/80 to-white">
        {!isSidebarCollapsed ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm tracking-wider shadow-xs shrink-0 ${roleMeta.avatarBg}`}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  ID: {user.userCode}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${roleMeta.className}`}
              >
                {roleMeta.label}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-1">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs tracking-wider shadow-xs ${roleMeta.avatarBg}`}
              title={`${user.name} (${roleMeta.label})`}
            >
              {initials}
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
          </div>
        )}
      </div>

      {/* 3. Navigation Items (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* Core Dashboard Link */}
        <div className="space-y-1">
          {renderNavLink({
            name: "Dashboard",
            href: "/",
          })}
        </div>

        {/* Dynamic Role-Filtered Navigation Categories */}
        {categories.map((category) => {
          const items = groupedNav[category];
          if (!items || items.length === 0) return null;

          return (
            <div key={category} className="space-y-1">
              {!isSidebarCollapsed ? (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {category}
                </div>
              ) : (
                <div className="my-2 border-t border-slate-200/80 mx-2" />
              )}
              {items.map((item: NavItem) => renderNavLink(item))}
            </div>
          );
        })}
      </div>

      {/* 4. Account & Security Section (With Change Password) */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2">
        {!isSidebarCollapsed && (
          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Account &amp; Security
          </div>
        )}

        {/* Change Password Button */}
        <button
          onClick={handleChangePasswordClick}
          title="Change Password"
          className={`w-full group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-sky-700 hover:bg-sky-50/70 border border-transparent hover:border-sky-200 transition-all cursor-pointer ${
            isSidebarCollapsed ? "justify-center px-2 py-2.5" : ""
          }`}
        >
          <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 group-hover:text-sky-600 group-hover:border-sky-200 shadow-2xs transition-colors">
            <KeyRound className="w-3.5 h-3.5" />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex-1 text-left truncate">
              <div className="truncate">Change Password</div>
            </div>
          )}
        </button>

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          title="Sign Out"
          className={`w-full group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer ${
            isSidebarCollapsed ? "justify-center px-2 py-2.5" : ""
          }`}
        >
          <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 group-hover:bg-rose-100 shadow-2xs transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex-1 text-left truncate">
              <div className="truncate">Sign Out</div>
            </div>
          )}
        </button>

        {/* Desktop Collapse / Expand Toggle Button */}
        <div className="hidden lg:flex items-center justify-center pt-2 border-t border-slate-200">
          <button
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer"
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-600" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 text-slate-600" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Floating Menu Toggle (Since Top Header is Removed) */}
      <button
        onClick={toggleMobileSidebar}
        className="lg:hidden fixed top-3 left-3 z-40 p-2.5 rounded-xl bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-md text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
        aria-label="Open Navigation Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ======================================================== */}
      {/* Desktop Persistent Sidebar                                */}
      {/* ======================================================== */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 ease-in-out sticky top-0 h-screen z-20 ${
          isSidebarCollapsed ? "w-20" : "w-68"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* ======================================================== */}
      {/* Mobile Drawer (with Backdrop)                             */}
      {/* ======================================================== */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={closeMobileSidebar}
            aria-hidden="true"
          />

          {/* Slide-over Drawer */}
          <div className="relative flex flex-col w-72 max-w-[85vw] bg-white shadow-2xl h-full z-10 animate-in slide-in-from-left duration-200">
            {/* Mobile Header with Close Button */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
                  <Image
                    src="/walton_logo.png"
                    alt="Walton Logo"
                    width={512}
                    height={512}
                    className="w-6 h-6 object-contain"
                  />
                </div>
                <span className="text-xs font-bold text-slate-900">
                  Navigation Menu
                </span>
              </div>
              <button
                onClick={closeMobileSidebar}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
                aria-label="Close Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sidebar Body */}
            <div className="flex-1 overflow-hidden">{sidebarContent}</div>
          </div>
        </div>
      )}
    </>
  );
};
