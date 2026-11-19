'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, ApiClientError } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import { ApiResponse } from '@/src/types/api';
import { IDashboardResponse } from '@/src/types/inventory';
import { ToastNotification, ToastMessage } from '@/src/components/common/ToastNotification';

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const [dashboardData, setDashboardData] = useState<IDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchDashboardStats = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<IDashboardResponse>>('/inventory/dashboard');
      if (res.success && res.data) {
        setDashboardData(res.data);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load dashboard metrics';
      setToast({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      const load = async () => {
        try {
          const res = await api.get<ApiResponse<IDashboardResponse>>('/inventory/dashboard');
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
      case 'RECEIVED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            RECEIVED
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            DELIVERED
          </span>
        );
      case 'COMPONENT_TRACKED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            TRACKED
          </span>
        );
      default:
        if (eventType.startsWith('REVERSED_')) {
          return (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
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

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      {/* Hero / Executive Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-8 text-white shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-sky-500/20 text-sky-300 text-xs font-semibold px-3 py-1 rounded-full border border-sky-400/30">
            <span>Walton Hi-Tech Industries PLC</span>
            <span>•</span>
            <span>Discrete Manufacturing IMS v2.4</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {isAuthenticated && user
              ? `Operational Dashboard — ${user.name}`
              : 'Industrial Barcode Inventory Management System'}
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed">
            High-throughput discrete manufacturing inventory execution system with real-time barcode serialization, immutable event ledger tracking, and financial-grade compensating audit trails.
          </p>

          {isAuthenticated && user ? (
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-xl font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Session: {user.role}</span>
              </span>
              <span className="text-slate-400 font-mono">Employee ID: {user.userCode}</span>
              {lastRefreshed && (
                <span className="text-slate-400 font-mono text-[11px]">
                  Refreshed: {lastRefreshed}
                </span>
              )}
            </div>
          ) : (
            <div className="pt-3">
              <Link
                href="/login"
                className="inline-flex items-center space-x-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
              >
                <span>Sign In to Access Industrial Workstations</span>
                <span>&rarr;</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Authenticated Dashboard Core */}
      {isAuthenticated && user ? (
        <div className="space-y-8">
          {/* Loading Indicator */}
          {loading && !dashboardData && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
              <span className="inline-block w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mr-3"></span>
              Aggregating real-time inventory ledger metrics from MongoDB Atlas...
            </div>
          )}

          {/* Primary Dashboard KPI Metric Cards */}
          {dashboardData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Current Stock Count */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Current Stock Count
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold">
                    📦
                  </div>
                </div>
                <p className="text-3xl font-black text-slate-900">
                  {dashboardData.metrics.currentStockCount}
                </p>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">Finished goods in warehouse</span>
                  <Link
                    href="/reports/stock-details?status=IN_STOCK"
                    className="font-bold text-emerald-600 hover:text-emerald-800 hover:underline"
                  >
                    View Stock &rarr;
                  </Link>
                </div>
              </div>

              {/* Card 2: Today's Received Products */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Today&apos;s Received
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold">
                    📥
                  </div>
                </div>
                <p className="text-3xl font-black text-emerald-600">
                  {dashboardData.metrics.todayReceivedCount}
                </p>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">Net intake admitted today</span>
                  <Link
                    href="/operations/receive"
                    className="font-bold text-emerald-600 hover:text-emerald-800 hover:underline"
                  >
                    Receive Bay &rarr;
                  </Link>
                </div>
              </div>

              {/* Card 3: Today's Delivered Products */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Today&apos;s Delivered
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-bold">
                    🚚
                  </div>
                </div>
                <p className="text-3xl font-black text-blue-600">
                  {dashboardData.metrics.todayDeliveredCount}
                </p>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">Dispatched from docks today</span>
                  <Link
                    href="/operations/delivery"
                    className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Delivery Dock &rarr;
                  </Link>
                </div>
              </div>

              {/* Card 4: Longest in Stock Alert */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Aging Inventory
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-sm font-bold">
                    ⏳
                  </div>
                </div>
                <p className="text-3xl font-black text-amber-600">
                  {dashboardData.longestInStockProducts.length > 0
                    ? `${dashboardData.longestInStockProducts[0].daysInStock}d`
                    : '0d'}
                </p>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">Max days in warehouse stock</span>
                  <button
                    onClick={fetchDashboardStats}
                    className="font-bold text-slate-600 hover:text-slate-900"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Operational Shortcuts Grid */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Quick Operational Workstations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(user.role === 'ADMIN' || user.role === 'COMPONENT_TRACKER') && (
                <Link
                  href="/operations/component-tracking"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all shadow-2xs group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-xl">🧩</span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700">
                      Component Tracking
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Scan chassis barcode and bind modular components (Compressor, Condenser) with 1:1 exclusivity.
                  </p>
                </Link>
              )}

              {(user.role === 'ADMIN' || user.role === 'RECEIVE_USER') && (
                <Link
                  href="/operations/receive"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all shadow-2xs group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-xl">📥</span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                      Product Receiving
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Admit tracked finished goods into available warehouse stock at designated intake bays.
                  </p>
                </Link>
              )}

              {(user.role === 'ADMIN' || user.role === 'DELIVERY_USER') && (
                <Link
                  href="/operations/delivery"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all shadow-2xs group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-xl">🚚</span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700">
                      Product Delivery
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Dispatch available units through dock stations, preserving origin intake bay reference.
                  </p>
                </Link>
              )}

              {user.role === 'ADMIN' && (
                <Link
                  href="/operations/reversals"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 transition-all shadow-2xs group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-xl">🔄</span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-rose-700">
                      Reversals &amp; Corrections
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Administrative compensating reversals with mandatory justification reasons and append-only ledger safety.
                  </p>
                </Link>
              )}

              {(user.role === 'ADMIN' || user.role === 'REPORT_VIEWER') && (
                <Link
                  href="/reports/stock-details"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all shadow-2xs group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-xl">📦</span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                      Stock Details Report
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Real-time stock balances by location, days in inventory, and modular component lists.
                  </p>
                </Link>
              )}

              {(user.role === 'ADMIN' || user.role === 'REPORT_VIEWER') && (
                <Link
                  href="/reports/barcode-history"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all shadow-2xs group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-xl">🔍</span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700">
                      Barcode Lifecycle Journey
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Trace any chassis barcode from assembly through intake, dispatch, and reversals.
                  </p>
                </Link>
              )}
            </div>
          </div>

          {/* Section: Products That Have Remained in Stock the Longest */}
          {dashboardData && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span>⏳</span>
                    <span>Products in Stock the Longest (Aging Inventory Analysis)</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Prioritize movement of aged inventory to maintain discrete warehouse turnover.
                  </p>
                </div>
                <Link
                  href="/reports/stock-details?status=IN_STOCK"
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  View Full Stock Details &rarr;
                </Link>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Chassis Barcode</th>
                      <th className="px-4 py-3 text-left">Product Model</th>
                      <th className="px-4 py-3 text-left">Receive Bay</th>
                      <th className="px-4 py-3 text-left">Intake Date</th>
                      <th className="px-4 py-3 text-left">Days in Stock</th>
                      <th className="px-4 py-3 text-left">Components</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {dashboardData.longestInStockProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                          No finished goods currently in warehouse stock.
                        </td>
                      </tr>
                    ) : (
                      dashboardData.longestInStockProducts.map((prod) => (
                        <tr key={prod.productBarcode} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <Link
                              href={`/reports/barcode-history?barcode=${prod.productBarcode}`}
                              className="font-mono font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                            >
                              {prod.productBarcode}
                            </Link>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {prod.productModel}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {prod.currentReceivePoint}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500">
                            {new Date(prod.receivedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                prod.daysInStock <= 7
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : prod.daysInStock <= 30
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {prod.daysInStock === 0 ? 'Today' : `${prod.daysInStock} days`}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-700">
                              🧩 {prod.componentCount} Bound
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/reports/barcode-history?barcode=${prod.productBarcode}`}
                              className="px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-lg border border-purple-200 transition-colors"
                            >
                              Lifecycle &rarr;
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Real-Time Ledger Feed & System Overview Grid */}
          {dashboardData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity Feed */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span>⚡</span>
                    <span>Live Append-Only Ledger Feed</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Last 8 transactions
                  </span>
                </div>

                <div className="space-y-2.5">
                  {dashboardData.recentTransactions.map((tx) => (
                    <div
                      key={tx._id}
                      className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        tx.isReversal
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {renderEventBadge(tx.eventType)}
                        <div>
                          <Link
                            href={`/reports/barcode-history?barcode=${tx.productBarcode}`}
                            className="font-mono font-bold text-slate-900 hover:underline"
                          >
                            {tx.productBarcode}
                          </Link>
                          <span className="text-slate-500 font-normal">
                            {' '}
                            • {tx.pointName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-mono">
                        <span>
                          {tx.userName} ({tx.userCode})
                        </span>
                        <span>•</span>
                        <span>{new Date(tx.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Master Catalog & System Integrity Overview */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Master System Architecture
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-600">Database Engine</span>
                    <span className="font-bold text-emerald-700">MongoDB Atlas Replica</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-600">Active Intake Bays</span>
                    <span className="font-bold text-slate-900">
                      {dashboardData.systemSummary.activeReceiveBaysCount} bays
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-600">Active Dispatch Docks</span>
                    <span className="font-bold text-slate-900">
                      {dashboardData.systemSummary.activeDeliveryDocksCount} docks
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-600">Master Product Catalog</span>
                    <span className="font-bold text-slate-900">
                      {dashboardData.systemSummary.activeProductsCatalogCount} models
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-600">Master Modular Components</span>
                    <span className="font-bold text-slate-900">
                      {dashboardData.systemSummary.activeComponentsCatalogCount} items
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-400">
                  Transaction Ledger Invariant: Append-only append operations strictly guaranteed by Mongoose schema pre-hooks.
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Unauthenticated Public View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <span className="text-2xl">🧩</span>
            <h3 className="text-base font-bold text-slate-900">1. Component Tracking</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Industrial modular tracking enforcing 1:1 serial exclusivity before warehouse stock admission.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <span className="text-2xl">📥</span>
            <h3 className="text-base font-bold text-slate-900">2. Product Receiving</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Warehouse stock admission at authorized receiving bays with automated state derivation.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <span className="text-2xl">🚚</span>
            <h3 className="text-base font-bold text-slate-900">3. Product Delivery</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Gate dispatch preserving origin intake bay reference and preventing duplicate deliveries.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
