"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  ArrowDownToLine,
  Truck,
  Clock,
  Cpu,
  RotateCcw,
  Search,
  ArrowRight,
  RefreshCw,
  ScanBarcode,
  BarChart3,
  ShieldCheck,
  Database,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { api, ApiClientError } from "@/src/lib/api";
import { useAuth } from "@/src/context/AuthContext";
import { ApiResponse } from "@/src/types/api";
import { IDashboardResponse } from "@/src/types/inventory";
import {
  ToastNotification,
  ToastMessage,
} from "@/src/components/common/ToastNotification";

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const [dashboardData, setDashboardData] = useState<IDashboardResponse | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const fetchDashboardStats = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<IDashboardResponse>>(
        "/inventory/dashboard",
      );
      if (res.success && res.data) {
        setDashboardData(res.data);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (err: unknown) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : "Failed to load dashboard metrics";
      setToast({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      const load = async () => {
        try {
          const res = await api.get<ApiResponse<IDashboardResponse>>(
            "/inventory/dashboard",
          );
          if (isMounted && res.success && res.data) {
            setDashboardData(res.data);
            setLastRefreshed(new Date().toLocaleTimeString());
          }
        } catch {
          // ignore error on mount
        }
      };
      load();
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const renderEventBadge = (eventType: string) => {
    switch (eventType) {
      case "RECEIVED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            RECEIVED
          </span>
        );
      case "DELIVERED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            DELIVERED
          </span>
        );
      case "COMPONENT_TRACKED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            TRACKED
          </span>
        );
      default:
        if (eventType.startsWith("REVERSED_")) {
          return (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
              REVERSED
            </span>
          );
        }
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
            {eventType}
          </span>
        );
    }
  };

  const getRoleHeaderDetails = () => {
    switch (user?.role) {
      case "ADMIN":
        return {
          title: "Executive Operations Command",
          subtitle:
            "Real-time serialized ledger, discrete intake & dispatch metrics, and multi-station oversight.",
          badge: "System Administrator",
          badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
        };
      case "COMPONENT_TRACKER":
        return {
          title: "Component Tracking Station",
          subtitle:
            "Scan chassis barcodes and bind serialized modular components (Compressors, Condensers, PCBA) with strict 1-to-N exclusivity.",
          badge: "Component Tracker",
          badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
        };
      case "RECEIVE_USER":
        return {
          title: "Warehouse Intake & Receiving Bay",
          subtitle:
            "Admit verified finished products into warehouse inventory bays with atomic component completeness checks.",
          badge: "Product Receiver",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "DELIVERY_USER":
        return {
          title: "Outbound Dispatch & Delivery Dock",
          subtitle:
            "Dispatch available stock units through logistics delivery docks while preserving intake bay provenance.",
          badge: "Product Deliverer",
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
        };
      case "REPORT_VIEWER":
        return {
          title: "Inventory Intelligence & Audit Hub",
          subtitle:
            "Serialized stock balance analytics, throughput velocity summaries, and end-to-end barcode lifecycle journeys.",
          badge: "Report Viewer",
          badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
        };
      default:
        return {
          title: "Operational Dashboard",
          subtitle:
            "Real-time serialized stock levels, intake and delivery metrics.",
          badge: user?.role || "Staff",
          badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        };
    }
  };

  const headerDetails = getRoleHeaderDetails();

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      {/* Authenticated Dashboard Core */}
      {isAuthenticated && user ? (
        <div className="space-y-6">
          {/* 1. Professional Role Header Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${headerDetails.badgeClass}`}
                  >
                    {headerDetails.badge}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 font-mono">
                    ID: {user.userCode}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {headerDetails.title}
                </h1>
                <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                  {headerDetails.subtitle}
                </p>
              </div>

              {/* Status & Refresh Controls */}
              <div className="flex flex-row md:flex-col items-start md:items-end justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Ledger Online</span>
                  {lastRefreshed && (
                    <span className="text-slate-400 font-mono text-[10px]">
                      ({lastRefreshed})
                    </span>
                  )}
                </div>

                <button
                  onClick={fetchDashboardStats}
                  disabled={loading}
                  title="Refresh Data"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`}
                  />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && !dashboardData && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-600" />
              Loading real-time inventory ledger metrics...
            </div>
          )}

          {/* 2. Primary KPI Cards */}
          {dashboardData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Current Stock Count (or WIP for Component Tracker) */}
              {user.role === "COMPONENT_TRACKER" ? (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      WIP In Assembly
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                      <Layers className="w-4 h-4 text-sky-600" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-sky-600">
                    {dashboardData.metrics.totalTrackedWipCount}
                  </p>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Ready for intake bay</span>
                    <Link
                      href="/operations/component-tracking"
                      className="font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                    >
                      <span>Tracking</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Current Stock Count
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Package className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900">
                    {dashboardData.metrics.currentStockCount}
                  </p>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500">In warehouse stock</span>
                    <Link
                      href="/reports/stock-details?status=IN_STOCK"
                      className="font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <span>View Stock</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Card 2: Today's Received */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Today&apos;s Received
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-600">
                  {dashboardData.metrics.todayReceivedCount}
                </p>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Intake recorded today</span>
                  <Link
                    href="/operations/receive"
                    className="font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <span>Receive Bay</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Card 3: Today's Delivered */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Today&apos;s Delivered
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Truck className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-blue-600">
                  {dashboardData.metrics.todayDeliveredCount}
                </p>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Dispatched today</span>
                  <Link
                    href="/operations/delivery"
                    className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <span>Delivery Dock</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Card 4: Longest in Stock Alert */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Aging Inventory
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-amber-600">
                  {dashboardData.longestInStockProducts.length > 0
                    ? `${dashboardData.longestInStockProducts[0].daysInStock}d`
                    : "0d"}
                </p>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Max days in stock</span>
                  <button
                    onClick={fetchDashboardStats}
                    className="font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Role-Tailored Operational Workstations */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <span>Authorized Workstations</span>
              <span className="text-[10px] font-normal text-slate-400">
                (Role-Specific Modules)
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Component Tracking Workstation */}
              {(user.role === "ADMIN" || user.role === "COMPONENT_TRACKER") && (
                <Link
                  href="/operations/component-tracking"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50/20 transition-all shadow-2xs group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Cpu className="w-5 h-5 text-sky-600" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                        Assembly
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                      Component Tracking Station
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Scan chassis barcodes and bind modular serialized components
                      (Compressors, Condensers, PCBA) with strict 1-to-N serial
                      exclusivity.
                    </p>
                  </div>
                  <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-600 group-hover:text-sky-700">
                    <span>Launch Station</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )}

              {/* Product Receiving Workstation */}
              {(user.role === "ADMIN" || user.role === "RECEIVE_USER") && (
                <Link
                  href="/operations/receive"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all shadow-2xs group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Intake Bay
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      Product Receiving Intake
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Admit verified finished goods into warehouse stock at
                      designated intake bays with atomic sub-assembly verification.
                    </p>
                  </div>
                  <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:text-emerald-700">
                    <span>Launch Station</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )}

              {/* Product Delivery Workstation */}
              {(user.role === "ADMIN" || user.role === "DELIVERY_USER") && (
                <Link
                  href="/operations/delivery"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all shadow-2xs group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Truck className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Outbound Dock
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      Product Delivery &amp; Dispatch
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Dispatch available units through dock stations, preserving
                      origin intake bay reference in the transaction history.
                    </p>
                  </div>
                  <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                    <span>Launch Station</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )}

              {/* Admin Reversals Workstation */}
              {user.role === "ADMIN" && (
                <Link
                  href="/operations/reversals"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50/20 transition-all shadow-2xs group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <RotateCcw className="w-5 h-5 text-rose-600" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        Compensating
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                      Reversals &amp; Corrections
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Administrative compensating reversals with mandatory audit
                      justification reasons.
                    </p>
                  </div>
                  <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-600 group-hover:text-rose-700">
                    <span>Audit Reversals</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )}

              {/* Stock Details Report (Report Viewer & Admin) */}
              {(user.role === "ADMIN" || user.role === "REPORT_VIEWER") && (
                <Link
                  href="/reports/stock-details"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all shadow-2xs group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Package className="w-5 h-5 text-emerald-600" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Inventory Ledger
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      Stock Details Report
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Real-time stock balances by physical intake bay, days in
                      inventory, and modular sub-assembly lists.
                    </p>
                  </div>
                  <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:text-emerald-700">
                    <span>View Report</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )}

              {/* Barcode Journey (Report Viewer & Admin) */}
              {(user.role === "ADMIN" || user.role === "REPORT_VIEWER") && (
                <Link
                  href="/reports/barcode-history"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/20 transition-all shadow-2xs group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <ScanBarcode className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        Lifecycle Trace
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                      Barcode Lifecycle Journey
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Chronological event timeline for any chassis or sub-assembly
                      barcode from assembly to dispatch.
                    </p>
                  </div>
                  <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600 group-hover:text-purple-700">
                    <span>Trace Barcode</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )}

              {/* Summary & Trends (Report Viewer & Admin) */}
              {(user.role === "ADMIN" || user.role === "REPORT_VIEWER") && (
                <Link
                  href="/reports/summary"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all shadow-2xs group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Throughput
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      Summary &amp; Trends Analytics
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Date-range throughput aggregates, net intake/dispatch
                      velocity charts, and operator stats.
                    </p>
                  </div>
                  <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                    <span>Analyze Trends</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )}

              {/* Admin Master Catalogs */}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin/master-data"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all shadow-2xs group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Database className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Master Data
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                      Master Catalogs
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Manage registered product models, component definitions, and
                      physical warehouse bay locations.
                    </p>
                  </div>
                  <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
                    <span>Manage Catalogs</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )}

              {/* Admin User Management */}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin/users"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50/50 transition-all shadow-2xs group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Users className="w-5 h-5 text-slate-600" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        RBAC
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-950 transition-colors">
                      User Management
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Manage operator employee IDs, credential resets, and single
                      clearance role assignments.
                    </p>
                  </div>
                  <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-slate-900">
                    <span>Manage Users</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )}

              {/* Standard Operating Procedure (SOP) Guide for Single-Role Workstations */}
              {user.role === "COMPONENT_TRACKER" && (
                <div className="p-5 rounded-2xl bg-linear-to-br from-sky-50/50 to-white border border-sky-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center space-x-2 text-sky-800 font-bold text-xs">
                    <ScanBarcode className="w-4 h-4 text-sky-600" />
                    <span>Barcode Scanner Operational Rules</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    <li>Accepts laser barcode scan or physical keyboard entry</li>
                    <li>Scan chassis barcode first to initialize binding</li>
                    <li>
                      Strict 1-to-N serial exclusivity: Duplicate component
                      barcodes will be rejected
                    </li>
                    <li>
                      Audio beep alerts provide real-time scan verification
                    </li>
                  </ul>
                </div>
              )}

              {user.role === "RECEIVE_USER" && (
                <div className="p-5 rounded-2xl bg-linear-to-br from-emerald-50/50 to-white border border-emerald-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Warehouse Intake Guidelines</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    <li>Select target physical bay prior to scanning chassis</li>
                    <li>
                      Atomic verification ensures all required sub-assemblies are
                      bound
                    </li>
                    <li>
                      Status transitions atomically from TRACKED to IN_STOCK
                    </li>
                    <li>Instant ledger recording with physical location audit</li>
                  </ul>
                </div>
              )}

              {user.role === "DELIVERY_USER" && (
                <div className="p-5 rounded-2xl bg-linear-to-br from-amber-50/50 to-white border border-amber-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    <span>Outbound Dispatch Protocol</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    <li>Select designated outbound delivery dock station</li>
                    <li>Only products currently in IN_STOCK can be dispatched</li>
                    <li>
                      Origin intake bay reference is preserved for audit trail
                    </li>
                    <li>
                      Delivery dispatches transition status directly to DELIVERED
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Guest / Unauthenticated Landing View */
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-1 max-w-2xl">
              <h2 className="text-3xl font-bold text-slate-900">
                Discrete Manufacturing Inventory System
              </h2>
              <p className="my-6 text-lg text-slate-500 leading-normal">
                Industrial serialized inventory execution system built for
                Walton Hi-Tech Industries PLC. Sign in with your assigned
                employee ID to access authorized workstations.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <span>Sign In to Workstations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 uppercase">
                1. Modular Assembly Binding
              </h3>
              <p className="text-[16px] text-slate-500 leading-normal">
                Scan product chassis and attach 1-to-N serialized components
                (Compressors, Condensers, PCBA) with strict duplicate
                prevention.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ArrowDownToLine className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 uppercase">
                2. Warehouse Intake Receiving
              </h3>
              <p className="text-[16px] text-slate-500 leading-normal">
                Atomic barcode verification ensuring required sub-assemblies are
                bound before admitting units into stock at designated receive
                points.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Truck className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 uppercase">
                3. Dispatch Dock Delivery
              </h3>
              <p className="text-[16px] text-slate-500 leading-normal">
                Issue verified inventory from active stock through delivery
                points while preserving original intake bay provenance in the
                transaction history.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
