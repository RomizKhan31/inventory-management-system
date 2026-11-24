'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { AdminStatsCards } from '@/src/components/admin/AdminStatsCards';
import { api, ApiClientError } from '@/src/lib/api';
import { IAuditLogItem, IPaginationMeta } from '@/src/types/admin';
import { ApiResponse } from '@/src/types/api';

interface AuditLogResponseData {
  data: IAuditLogItem[];
  meta?: IPaginationMeta;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<IAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [pagination, setPagination] = useState<IPaginationMeta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Selected Log Details Modal
  const [selectedLog, setSelectedLog] = useState<IAuditLogItem | null>(null);

  const fetchLogs = useCallback(
    async (page = 1, showSpinner = true) => {
      if (showSpinner) setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '20',
        });
        if (search.trim()) params.append('search', search.trim());
        if (entityFilter !== 'ALL') params.append('entity', entityFilter);
        if (actionFilter !== 'ALL') params.append('action', actionFilter);

        const res = await api.get<ApiResponse<IAuditLogItem[]> & AuditLogResponseData>(
          `/reports/audit-logs?${params.toString()}`
        );
        if (res.success && res.data) {
          setLogs(res.data);
          if (res.meta) {
            setPagination({
              total: res.meta.total || 0,
              page: res.meta.page || 1,
              limit: res.meta.limit || 20,
              totalPages: res.meta.totalPages || 1,
            });
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof ApiClientError ? err.message : 'Failed to retrieve audit logs';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [search, entityFilter, actionFilter]
  );

  useEffect(() => {
    let isMounted = true;
    const initialLoad = async () => {
      try {
        const params = new URLSearchParams({ page: '1', limit: '20' });
        if (search.trim()) params.append('search', search.trim());
        if (entityFilter !== 'ALL') params.append('entity', entityFilter);
        if (actionFilter !== 'ALL') params.append('action', actionFilter);

        const res = await api.get<ApiResponse<IAuditLogItem[]> & AuditLogResponseData>(
          `/reports/audit-logs?${params.toString()}`
        );
        if (isMounted && res.success && res.data) {
          setLogs(res.data);
          if (res.meta) {
            setPagination(res.meta);
          }
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof ApiClientError ? err.message : 'Failed to retrieve audit logs';
          setError(msg);
          setLoading(false);
        }
      }
    };

    initialLoad();
    return () => {
      isMounted = false;
    };
  }, [search, entityFilter, actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1, true);
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes('CREATED')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('UPDATED') || action.includes('CHANGED'))
      return 'bg-sky-50 text-sky-700 border-sky-200';
    if (action.includes('DELETED') || action.includes('DEACTIVATED'))
      return 'bg-amber-50 text-amber-700 border-amber-200';
    if (action.includes('LOGIN')) return 'bg-slate-100 text-slate-700 border-slate-200';
    return 'bg-purple-50 text-purple-700 border-purple-200';
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="space-y-6">
        <AdminStatsCards />

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Compliance &amp; Traceability
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Audit Logs
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                System Audit &amp; Security Logs
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Append-only historical records capturing master data modifications, user role changes, previous values, and operator IP addresses.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                {error}
              </div>
            )}

            {/* Search & Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
              <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search by Operator Code, Name, or Entity ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 text-slate-800"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                >
                  Search
                </button>
              </form>

              <div className="flex items-center space-x-2 w-full md:w-auto">
                <select
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">All Entities</option>
                  <option value="USER">USER</option>
                  <option value="PRODUCT">PRODUCT</option>
                  <option value="COMPONENT">COMPONENT</option>
                  <option value="RECEIVE_POINT">RECEIVE_POINT</option>
                  <option value="DELIVERY_POINT">DELIVERY_POINT</option>
                  <option value="INVENTORY_TRANSACTION">INVENTORY_TRANSACTION</option>
                </select>

                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">All Actions</option>
                  <option value="USER_CREATED">USER_CREATED</option>
                  <option value="USER_UPDATED">USER_UPDATED</option>
                  <option value="USER_ROLE_CHANGED">USER_ROLE_CHANGED</option>
                  <option value="USER_ACTIVATED">USER_ACTIVATED</option>
                  <option value="USER_DEACTIVATED">USER_DEACTIVATED</option>
                  <option value="MASTER_DATA_CREATED">MASTER_DATA_CREATED</option>
                  <option value="MASTER_DATA_UPDATED">MASTER_DATA_UPDATED</option>
                  <option value="MASTER_DATA_SOFT_DELETED">MASTER_DATA_SOFT_DELETED</option>
                </select>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Entity</th>
                      <th className="py-3 px-4">Target Entity ID</th>
                      <th className="py-3 px-4">Responsible User</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          Loading audit records...
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          No audit entries match the current filter.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getActionBadgeClass(
                                log.action
                              )}`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {log.entity}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {log.entityId || 'N/A'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900">
                              {log.userCode || 'System'}
                            </span>
                            {log.userName && (
                              <span className="text-slate-400 text-[11px]"> ({log.userName})</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="px-2.5 py-1 text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Inspect Delta
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Total {pagination.total} immutable audit records
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => fetchLogs(pagination.page - 1, true)}
                    disabled={pagination.page <= 1 || loading}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium"
                  >
                    &larr; Prev
                  </button>
                  <span className="font-semibold text-slate-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => fetchLogs(pagination.page + 1, true)}
                    disabled={pagination.page >= pagination.totalPages || loading}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>

      {/* ---------------- INSPECT DELTA MODAL ---------------- */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Audit Entry: {selectedLog.action}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedLog.entity} • Target ID: {selectedLog.entityId}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Responsible User</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {selectedLog.userName} ({selectedLog.userCode})
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Timestamp</span>
                  <p className="font-mono text-slate-700 mt-0.5">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </p>
                </div>
                {selectedLog.ipAddress && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">IP Address</span>
                    <p className="font-mono text-slate-700 mt-0.5">{selectedLog.ipAddress}</p>
                  </div>
                )}
                {selectedLog.userAgent && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">User Agent</span>
                    <p className="text-[10px] text-slate-600 truncate mt-0.5" title={selectedLog.userAgent}>
                      {selectedLog.userAgent}
                    </p>
                  </div>
                )}
              </div>

              {/* Previous vs New Values */}
              <div className="space-y-3">
                {selectedLog.previousValues && (
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">Previous Values:</span>
                    <pre className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-[11px] font-mono text-amber-900 overflow-x-auto">
                      {JSON.stringify(selectedLog.previousValues, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.newValues && (
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">New Values:</span>
                    <pre className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-[11px] font-mono text-emerald-900 overflow-x-auto">
                      {JSON.stringify(selectedLog.newValues, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3 flex justify-end border-t border-slate-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
