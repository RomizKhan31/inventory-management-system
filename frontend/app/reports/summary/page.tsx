'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Download,
  ArrowDownToLine,
  Truck,
  RotateCcw,
  FileText,
  BarChart3,
} from 'lucide-react';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { ToastNotification, ToastMessage } from '@/src/components/common/ToastNotification';
import { api, ApiClientError, getToken } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import { IDateRangeSummaryData } from '@/src/types/inventory';

export default function SummaryTrendsPage() {
  const { user } = useAuth();

  // Date Range State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activePreset, setActivePreset] = useState<'30D' | '7D' | 'TODAY' | 'CUSTOM'>('30D');

  // Report Data
  const [data, setData] = useState<IDateRangeSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Set initial 30 days
  const applyPreset = (preset: '30D' | '7D' | 'TODAY' | 'CUSTOM') => {
    setActivePreset(preset);
    const now = new Date();
    const endStr = now.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      setStartDate(endStr);
      setEndDate(endStr);
    } else if (preset === '7D') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (preset === '30D') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(endStr);
    }
  };

  const fetchSummary = useCallback(async (start?: string, end?: string) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (start) queryParams.set('startDate', start);
      if (end) queryParams.set('endDate', end);

      const res = await api.get<{
        success: boolean;
        data: IDateRangeSummaryData;
      }>(`/reports/summary?${queryParams.toString()}`);

      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to generate date-range summary report';
      setToast({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const now = new Date();
    const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startStr = past.toISOString().split('T')[0];
    const endStr = now.toISOString().split('T')[0];

    const loadInitial = async () => {
      try {
        const res = await api.get<{
          success: boolean;
          data: IDateRangeSummaryData;
        }>(`/reports/summary?startDate=${startStr}&endDate=${endStr}`);

        if (isMounted && res.success && res.data) {
          setData(res.data);
          setStartDate(startStr);
          setEndDate(endStr);
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

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const queryParams = new URLSearchParams({
        reportType: 'summary',
      });
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
      a.download = `walton_summary_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setToast({ type: 'success', text: 'Summary report exported successfully in CSV format.' });
    } catch {
      setToast({ type: 'error', text: 'Failed to download summary export.' });
    }
  };

  // Compute maximum daily value for SVG chart scaling
  const maxDailyValue = data?.dailyActivity.reduce((acc, curr) => {
    const dayMax = Math.max(curr.received, curr.delivered, curr.reversals, curr.componentsTracked);
    return Math.max(acc, dayMax);
  }, 10) || 10;

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'REPORT_VIEWER']}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-blue-50 text-blue-800 border border-blue-200">
                  Analytics &amp; Trends
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Window: {data?.dateRange.startDate} to {data?.dateRange.endDate}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span>Date-Range Summary &amp; Operational Trends</span>
              </h1>
              <p className="text-xs text-slate-600">
                Aggregated volume throughput metrics, net inventory intake/dispatch rates, and daily trend visualizations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <div className="text-right pl-3 border-l border-slate-200 hidden sm:block">
                <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500 font-mono">Role: {user?.role}</p>
              </div>
            </div>
          </div>

          {/* Toast Notification */}
          <ToastNotification toast={toast} onClose={() => setToast(null)} />

          {/* Date Range Selector Toolbar */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase mr-1">Time Range:</span>
              {(['30D', '7D', 'TODAY'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    applyPreset(preset);
                    const now = new Date();
                    const endStr = now.toISOString().split('T')[0];
                    let pastDays = 30;
                    if (preset === 'TODAY') pastDays = 0;
                    if (preset === '7D') pastDays = 7;
                    const past = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000);
                    fetchSummary(past.toISOString().split('T')[0], endStr);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activePreset === preset
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {preset === '30D' ? 'Last 30 Days' : preset === '7D' ? 'Last 7 Days' : 'Today'}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('CUSTOM');
                }}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('CUSTOM');
                }}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
              />
              <button
                disabled={loading}
                onClick={() => fetchSummary(startDate, endDate)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl"
              >
                {loading ? 'Loading...' : 'Apply'}
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
              <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></span>
              Aggregating operational analytics across selected date range...
            </div>
          )}

          {/* Executive KPI Cards */}
          {data && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Net Stock Receipts</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-600">
                  {data.metrics.netActiveReceived}
                </p>
                <p className="text-[11px] text-slate-400">
                  Gross: {data.metrics.totalReceived} • Reversals: -{data.metrics.reversals.reversedReceive}
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Net Dispatched</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Truck className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-blue-600">
                  {data.metrics.netActiveDelivered}
                </p>
                <p className="text-[11px] text-slate-400">
                  Gross: {data.metrics.totalDelivered} • Reversals: -{data.metrics.reversals.reversedDelivery}
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Total Reversals</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <RotateCcw className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-amber-600">
                  {data.metrics.reversals.total}
                </p>
                <p className="text-[11px] text-slate-400">
                  Compensated: Rcv ({data.metrics.reversals.reversedReceive}), Del ({data.metrics.reversals.reversedDelivery}), Comp ({data.metrics.reversals.reversedComponent})
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Total Ledger Events</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-slate-700" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900">
                  {data.metrics.totalTransactions}
                </p>
                <p className="text-[11px] text-slate-400">
                  Components Tracked: {data.metrics.totalComponentsTracked}
                </p>
              </div>
            </div>
          )}

          {/* Interactive Graphical Chart: Daily Activity Trends */}
          {data && data.dailyActivity.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-slate-700" />
                    <span>Daily Throughput Activity Trends</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Day-by-day comparison of intake receipts, outbound dispatches, and administrative reversals.
                  </p>
                </div>

                {/* Chart Legend */}
                <div className="flex items-center space-x-4 text-xs font-semibold">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-xs bg-emerald-500"></span>
                    <span>Received</span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-xs bg-blue-500"></span>
                    <span>Delivered</span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-xs bg-amber-500"></span>
                    <span>Reversals</span>
                  </span>
                </div>
              </div>

              {/* Pure SVG Trend Visualizer */}
              <div className="pt-4">
                <div className="h-64 flex items-end space-x-2 border-b border-l border-slate-300 px-2 pb-2">
                  {data.dailyActivity.map((day) => {
                    const rcvHeight = Math.max(4, Math.round((day.received / maxDailyValue) * 220));
                    const delHeight = Math.max(4, Math.round((day.delivered / maxDailyValue) * 220));
                    const revHeight = Math.max(4, Math.round((day.reversals / maxDailyValue) * 220));

                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center justify-end h-full group relative"
                      >
                        {/* Tooltip */}
                        <div className="absolute -top-16 hidden group-hover:flex flex-col items-center z-10 bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                          <span className="font-bold">{day.date}</span>
                          <span>Received: {day.received} | Delivered: {day.delivered}</span>
                          <span>Reversals: {day.reversals}</span>
                        </div>

                        {/* Bars cluster */}
                        <div className="flex items-end space-x-0.5 w-full justify-center">
                          <div
                            style={{ height: `${rcvHeight}px` }}
                            className="w-2 sm:w-3 bg-emerald-500 hover:bg-emerald-600 rounded-t-xs transition-all"
                            title={`Received: ${day.received}`}
                          ></div>
                          <div
                            style={{ height: `${delHeight}px` }}
                            className="w-2 sm:w-3 bg-blue-500 hover:bg-blue-600 rounded-t-xs transition-all"
                            title={`Delivered: ${day.delivered}`}
                          ></div>
                          {day.reversals > 0 && (
                            <div
                              style={{ height: `${revHeight}px` }}
                              className="w-1.5 sm:w-2 bg-amber-500 hover:bg-amber-600 rounded-t-xs transition-all"
                              title={`Reversals: ${day.reversals}`}
                            ></div>
                          )}
                        </div>

                        {/* Date label */}
                        <span className="text-[10px] text-slate-400 font-mono mt-2 truncate w-full text-center">
                          {day.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Breakdown Tables Grid */}
          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Receive Points Intake Table */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Intake Bays Throughput</span>
                  <span className="text-[11px] font-normal text-slate-500">By Receive Point</span>
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Intake Bay</th>
                        <th className="px-4 py-2.5 text-center">Received</th>
                        <th className="px-4 py-2.5 text-center">Reversals</th>
                        <th className="px-4 py-2.5 text-right">Net Stock Added</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {data.receivePointsSummary.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-slate-400 italic">
                            No intake records in this period.
                          </td>
                        </tr>
                      ) : (
                        data.receivePointsSummary.map((p) => (
                          <tr key={p.pointName} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-medium text-slate-900">{p.pointName}</td>
                            <td className="px-4 py-2.5 text-center text-emerald-700 font-bold">
                              {p.receivedCount}
                            </td>
                            <td className="px-4 py-2.5 text-center text-amber-700 font-semibold">
                              {p.reversedCount}
                            </td>
                            <td className="px-4 py-2.5 text-right font-black text-slate-900">
                              {p.netReceived}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Delivery Points Dispatches Table */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Dispatch Docks Throughput</span>
                  <span className="text-[11px] font-normal text-slate-500">By Delivery Point</span>
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Delivery Dock</th>
                        <th className="px-4 py-2.5 text-center">Dispatched</th>
                        <th className="px-4 py-2.5 text-center">Reversals</th>
                        <th className="px-4 py-2.5 text-right">Net Dispatched</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {data.deliveryPointsSummary.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-slate-400 italic">
                            No dispatch records in this period.
                          </td>
                        </tr>
                      ) : (
                        data.deliveryPointsSummary.map((d) => (
                          <tr key={d.pointName} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-medium text-slate-900">{d.pointName}</td>
                            <td className="px-4 py-2.5 text-center text-blue-700 font-bold">
                              {d.deliveredCount}
                            </td>
                            <td className="px-4 py-2.5 text-center text-amber-700 font-semibold">
                              {d.reversedCount}
                            </td>
                            <td className="px-4 py-2.5 text-right font-black text-slate-900">
                              {d.netDelivered}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Operator Activity Breakdown Table */}
          {data && data.operatorActivity.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                <span>Operational Personnel Activity</span>
                <span className="text-[11px] font-normal text-slate-500">Audited Ledger Actions</span>
              </h3>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Operator Code</th>
                      <th className="px-4 py-2.5 text-left">Operator Name</th>
                      <th className="px-4 py-2.5 text-center">Components Bound</th>
                      <th className="px-4 py-2.5 text-center">Intakes Completed</th>
                      <th className="px-4 py-2.5 text-center">Dispatches Completed</th>
                      <th className="px-4 py-2.5 text-center">Reversals Handled</th>
                      <th className="px-4 py-2.5 text-right">Total Ledger Events</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {data.operatorActivity.map((op) => (
                      <tr key={op.userCode} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-800">{op.userCode}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{op.userName}</td>
                        <td className="px-4 py-2.5 text-center text-purple-700 font-semibold">{op.trackedCount}</td>
                        <td className="px-4 py-2.5 text-center text-emerald-700 font-semibold">{op.receivedCount}</td>
                        <td className="px-4 py-2.5 text-center text-blue-700 font-semibold">{op.deliveredCount}</td>
                        <td className="px-4 py-2.5 text-center text-amber-700 font-semibold">{op.reversedCount}</td>
                        <td className="px-4 py-2.5 text-right font-black text-slate-900">{op.totalActions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
