'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  ArrowDownToLine,
  Truck,
  Clock,
  Cpu,
  RotateCcw,
  Search,
  Activity,
  ArrowRight,
  RefreshCw,
  Layers,
  ExternalLink,
} from 'lucide-react';
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
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            RECEIVED
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            DELIVERED
          </span>
        );
      case 'COMPONENT_TRACKED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            TRACKED
          </span>
        );
      default:
        if (eventType.startsWith('REVERSED_')) {
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

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      {/* Dashboard Header Bar */}
      {isAuthenticated && user && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Operational Dashboard
            </h1>
            <p className="text-xs text-slate-500">
              Real-time serialized stock levels, intake and delivery metrics
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-[11px] text-slate-400 font-mono">
                Updated: {lastRefreshed}
              </span>
            )}
            <button
              onClick={fetchDashboardStats}
              disabled={loading}
              title="Refresh Data"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      )}

      {/* Authenticated Dashboard Core */}
      {isAuthenticated && user ? (
        <div className="space-y-6">
          {/* Loading Indicator */}
          {loading && !dashboardData && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-600" />
              Loading real-time inventory ledger metrics...
            </div>
          )}

          {/* Primary Dashboard KPI Metric Cards */}
          {dashboardData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Current Stock Count */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-2">
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

              {/* Card 2: Today's Received Products */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-2">
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

              {/* Card 3: Today's Delivered Products */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-2">
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
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-2">
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
                    : '0d'}
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

          {/* Quick Operational Shortcuts Grid */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Operational Workstations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(user.role === 'ADMIN' || user.role === 'COMPONENT_TRACKER') && (
                <Link
                  href="/operations/component-tracking"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/20 transition-all shadow-xs group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                      <Cpu className="w-4 h-4 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700">
                      Component Tracking
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Scan chassis barcode and bind modular components with 1-to-N serial exclusivity.
                  </p>
                </Link>
              )}

              {(user.role === 'ADMIN' || user.role === 'RECEIVE_USER') && (
                <Link
                  href="/operations/receive"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all shadow-xs group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                      Product Receiving
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Admit verified finished goods into warehouse stock at designated intake bays.
                  </p>
                </Link>
              )}

              {(user.role === 'ADMIN' || user.role === 'DELIVERY_USER') && (
                <Link
                  href="/operations/delivery"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all shadow-xs group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                      <Truck className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700">
                      Product Delivery
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Dispatch available units through dock stations, preserving origin intake bay reference.
                  </p>
                </Link>
              )}

              {user.role === 'ADMIN' && (
                <Link
                  href="/operations/reversals"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50/20 transition-all shadow-xs group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                      <RotateCcw className="w-4 h-4 text-rose-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-rose-700">
                      Reversals &amp; Corrections
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Administrative compensating reversals with mandatory audit justification reasons.
                  </p>
                </Link>
              )}

              {(user.role === 'ADMIN' || user.role === 'REPORT_VIEWER') && (
                <Link
                  href="/reports/stock-details"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all shadow-xs group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Package className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                      Stock Details Report
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Real-time stock balances by location, days in inventory, and modular component lists.
                  </p>
                </Link>
              )}

              {(user.role === 'ADMIN' || user.role === 'REPORT_VIEWER') && (
                <Link
                  href="/reports/barcode-history"
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/20 transition-all shadow-xs group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                      <Search className="w-4 h-4 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700">
                      Barcode Lifecycle Journey
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Trace any chassis barcode from assembly through intake, dispatch, and reversals.
                  </p>
                </Link>
              )}
            </div>
          </div>

          {/* Section: Products That Have Remained in Stock the Longest */}
          {dashboardData && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Aging Inventory Analysis (Longest in Stock)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Prioritize movement of aged inventory to maintain discrete warehouse turnover.
                  </p>
                </div>
                <Link
                  href="/reports/stock-details?status=IN_STOCK"
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                >
                  <span>View Full Stock Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
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
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                              <Cpu className="w-3.5 h-3.5 text-purple-600" />
                              <span>{prod.componentCount} Bound</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/reports/barcode-history?barcode=${prod.productBarcode}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-lg border border-purple-200 transition-colors"
                            >
                              <span>Lifecycle</span>
                              <ExternalLink className="w-3 h-3" />
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
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-600" />
                    <span>Real-Time Event Ledger Feed</span>
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

              {/* Master System Overview */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-600" />
                  <span>Master System Architecture</span>
                </h3>

                <div className="space-y-2.5 text-xs">
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
                    <span className="text-slate-600">Modular Components</span>
                    <span className="font-bold text-slate-900">
                      {dashboardData.systemSummary.activeComponentsCatalogCount} types
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Guest / Unauthenticated Landing View */
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-1 max-w-2xl">
              <h2 className="text-lg font-bold text-slate-900">
                Discrete Manufacturing Inventory System
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Industrial serialized inventory execution system built for Walton Hi-Tech Industries PLC. Sign in with your assigned employee ID to access authorized workstations.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <span>Sign In to Workstations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-sky-600" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase">
                1. Modular Assembly Binding
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Scan product chassis and attach 1-to-N serialized components (Compressors, Condensers, PCBA) with strict duplicate prevention.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase">
                2. Warehouse Intake Receiving
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Atomic barcode verification ensuring required sub-assemblies are bound before admitting units into stock at designated receive points.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase">
                3. Dispatch Dock Delivery
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Issue verified inventory from active stock through delivery points while preserving original intake bay provenance in the transaction history.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
