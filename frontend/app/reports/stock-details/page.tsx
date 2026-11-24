'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  Download,
  Cpu,
  AlertTriangle,
  X,
} from 'lucide-react';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { ToastNotification, ToastMessage } from '@/src/components/common/ToastNotification';
import { api, ApiClientError, getToken } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import {
  IStockItemReportItem,
  IStockDetailsKpiSummary,
} from '@/src/types/inventory';

export default function StockDetailsPage() {
  const { user } = useAuth();

  // Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'DELIVERED' | 'TRACKED' | 'NEW_UNTRACKED'>('ALL');
  const [pointNameFilter, setPointNameFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Data State
  const [items, setItems] = useState<IStockItemReportItem[]>([]);
  const [kpiSummary, setKpiSummary] = useState<IStockDetailsKpiSummary | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Selected Chassis for Components Drawer / Modal
  const [selectedItemComponents, setSelectedItemComponents] = useState<IStockItemReportItem | null>(null);

  // Fetch Report Data
  const fetchReport = useCallback(
    async (
      targetPage = page,
      searchKeyword = search,
      status = statusFilter,
      point = pointNameFilter,
      start = startDate,
      end = endDate
    ) => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(targetPage),
          limit: String(limit),
        });
        if (searchKeyword.trim()) queryParams.set('search', searchKeyword.trim());
        if (status && status !== 'ALL') queryParams.set('status', status);
        if (point.trim()) queryParams.set('pointName', point.trim());
        if (start) queryParams.set('startDate', start);
        if (end) queryParams.set('endDate', end);

        const res = await api.get<{
          success: boolean;
          data: IStockItemReportItem[];
          pagination: { total: number; page: number; limit: number; totalPages: number };
          kpiSummary: IStockDetailsKpiSummary;
        }>(`/reports/stock-details?${queryParams.toString()}`);

        if (res.success && res.data) {
          setItems(res.data);
          setTotalItems(res.pagination?.total || 0);
          setTotalPages(res.pagination?.totalPages || 1);
          setPage(res.pagination?.page || 1);
          setKpiSummary(res.kpiSummary || null);
        }
      } catch (err: unknown) {
        const msg = err instanceof ApiClientError ? err.message : 'Failed to generate stock details report';
        setToast({ type: 'error', text: msg });
      } finally {
        setLoading(false);
      }
    },
    [page, search, statusFilter, pointNameFilter, startDate, endDate]
  );

  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      try {
        const res = await api.get<{
          success: boolean;
          data: IStockItemReportItem[];
          pagination: { total: number; page: number; limit: number; totalPages: number };
          kpiSummary: IStockDetailsKpiSummary;
        }>('/reports/stock-details?page=1&limit=15');
        if (isMounted && res.success && res.data) {
          setItems(res.data);
          setTotalItems(res.pagination?.total || 0);
          setTotalPages(res.pagination?.totalPages || 1);
          setPage(1);
          setKpiSummary(res.kpiSummary || null);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    };
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle CSV Export
  const handleExportCsv = async () => {
    try {
      const queryParams = new URLSearchParams({
        reportType: 'stock-details',
      });
      if (search.trim()) queryParams.set('search', search.trim());
      if (statusFilter && statusFilter !== 'ALL') queryParams.set('status', statusFilter);
      if (pointNameFilter.trim()) queryParams.set('pointName', pointNameFilter.trim());
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/reports/export?${queryParams.toString()}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error('Export request failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `walton_stock_details_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setToast({ type: 'success', text: 'Stock details report downloaded successfully in CSV format.' });
    } catch {
      setToast({ type: 'error', text: 'Failed to download report export.' });
    }
  };

  // Helper: Status Badges
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            IN STOCK
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
            DELIVERED
          </span>
        );
      case 'TRACKED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span>
            TRACKED (NOT IN STOCK)
          </span>
        );
      case 'NEW_UNTRACKED':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            NEW / UNTRACKED
          </span>
        );
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'REPORT_VIEWER']}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Inventory Reports
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Access: Read-Only
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                <span>Stock Details by Location &amp; Status</span>
              </h1>
              <p className="text-xs text-slate-600">
                Live multi-dimensional inventory balances derived directly from the immutable transaction ledger.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              {/* <div className="text-right pl-3 border-l border-slate-200 hidden sm:block">
                <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500 font-mono">Role: {user?.role}</p>
              </div> */}
            </div>
          </div>

          {/* Toast Notification */}
          <ToastNotification toast={toast} onClose={() => setToast(null)} />

          {/* KPI Summary Cards */}
          {kpiSummary && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-xs text-slate-500 font-medium">Available in Stock</span>
                <p className="text-2xl font-black text-emerald-600">{kpiSummary.totalInStock}</p>
                <span className="text-[11px] text-slate-400">Finished goods in bays</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-xs text-slate-500 font-medium">Delivered / Dispatched</span>
                <p className="text-2xl font-black text-blue-600">{kpiSummary.totalDelivered}</p>
                <span className="text-[11px] text-slate-400">Shipped through docks</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-xs text-slate-500 font-medium">Tracked / Work-in-Progress</span>
                <p className="text-2xl font-black text-purple-600">{kpiSummary.totalTrackedOnly}</p>
                <span className="text-[11px] text-slate-400">Awaiting stock intake</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-xs text-slate-500 font-medium">Units with Reversals</span>
                <p className="text-2xl font-black text-amber-600">{kpiSummary.totalUnitsWithReversals}</p>
                <span className="text-[11px] text-slate-400">Compensated by Admin</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-xs text-slate-500 font-medium">Intake Bays in Use</span>
                <p className="text-2xl font-black text-slate-800">{kpiSummary.distinctReceiveBaysInUse}</p>
                <span className="text-[11px] text-slate-400">Active receiving bays</span>
              </div>
            </div>
          )}

          {/* Search & Filters Toolbar */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Keyword */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Search Barcode / Model / Component
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchReport(1)}
                  placeholder="e.g. 2440701AK2057, Refrigerator..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Stock Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    const val = e.target.value as 'ALL' | 'IN_STOCK' | 'DELIVERED' | 'TRACKED' | 'NEW_UNTRACKED';
                    setStatusFilter(val);
                    fetchReport(1, search, val);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="IN_STOCK">In Stock (Available)</option>
                  <option value="DELIVERED">Delivered (Dispatched)</option>
                  <option value="TRACKED">Tracked (WIP)</option>
                  <option value="NEW_UNTRACKED">Untracked</option>
                </select>
              </div>

              {/* Receive Bay Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Receive Bay / Dock
                </label>
                <input
                  type="text"
                  value={pointNameFilter}
                  onChange={(e) => setPointNameFilter(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchReport(1)}
                  placeholder="e.g. Bay 1, DP-REF-01..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Filter Actions */}
              <div className="flex items-end space-x-2">
                <button
                  onClick={() => fetchReport(1)}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Apply Filters
                </button>
                <button
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                    setPointNameFilter('');
                    setStartDate('');
                    setEndDate('');
                    fetchReport(1, '', 'ALL', '', '', '');
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200"
                  title="Reset Filters"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Chassis Barcode</th>
                    <th className="px-4 py-3 text-left">Model Name</th>
                    <th className="px-4 py-3 text-left">Stock Status</th>
                    <th className="px-4 py-3 text-left">Location (Bay / Dock)</th>
                    <th className="px-4 py-3 text-left">Intake Date / Aging</th>
                    <th className="px-4 py-3 text-left">Components</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                        <span className="inline-block w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-2"></span>
                        Calculating stock positions from immutable transaction ledger...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                        No products found matching the specified report criteria.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.productBarcode} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            href={`/reports/barcode-history?barcode=${item.productBarcode}`}
                            className="font-mono font-bold text-emerald-700 hover:text-emerald-900 hover:underline block"
                          >
                            {item.productBarcode}
                          </Link>
                          {item.hasReversals && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 mt-0.5">
                              <AlertTriangle className="w-3 h-3 text-amber-700" />
                              <span>Reversed</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900 block">{item.productModel}</span>
                        </td>

                        <td className="px-4 py-3">{renderStatusBadge(item.status)}</td>

                        <td className="px-4 py-3">
                          {item.status === 'IN_STOCK' ? (
                            <div>
                              <span className="font-medium text-slate-800 block">
                                {item.currentReceivePoint || 'Warehouse Receiving Bay'}
                              </span>
                              {item.receivedBy && (
                                <span className="text-[10px] text-slate-500 block">
                                  By {item.receivedBy} ({item.receiveUserCode})
                                </span>
                              )}
                            </div>
                          ) : item.status === 'DELIVERED' ? (
                            <div>
                              <span className="font-medium text-slate-800 block">
                                {item.deliveryPoint || 'Dispatched via Dock'}
                              </span>
                              {item.deliveredBy && (
                                <span className="text-[10px] text-slate-500 block">
                                  By {item.deliveredBy} ({item.deliveryUserCode})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not in warehouse stock</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {item.receivedAt ? (
                            <div>
                              <span className="font-mono text-slate-600 block">
                                {new Date(item.receivedAt).toLocaleDateString()}
                              </span>
                              {item.status === 'IN_STOCK' && item.daysInStock !== undefined && (
                                <span
                                  className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold mt-0.5 ${
                                    item.daysInStock <= 7
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : item.daysInStock <= 30
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {item.daysInStock === 0 ? 'Today' : `${item.daysInStock}d in stock`}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedItemComponents(item)}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 cursor-pointer"
                          >
                            <Cpu className="w-3.5 h-3.5 text-purple-600" />
                            <span>{item.componentCount} Bound</span>
                          </button>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/reports/barcode-history?barcode=${item.productBarcode}`}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors inline-block"
                          >
                            Lifecycle History &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <span>
                Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} total products)
              </span>
              <div className="flex space-x-2">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => fetchReport(page - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages || loading}
                  onClick={() => fetchReport(page + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Attached Components Modal / Drawer */}
          {selectedItemComponents && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Modular Components Breakdown
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      Chassis: {selectedItemComponents.productBarcode}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedItemComponents(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {selectedItemComponents.components.length > 0 ? (
                    selectedItemComponents.components.map((comp) => (
                      <div
                        key={comp.barcode}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 block">{comp.name}</span>
                          <span className="font-mono text-purple-700 block">{comp.barcode}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(comp.attachedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-4">
                      No modular components actively bound.
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedItemComponents(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
