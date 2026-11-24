'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  RotateCcw,
  FileText,
  Search,
  Target,
  ScanBarcode,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  RefreshCw,
  Undo2,
  Check,
} from 'lucide-react';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { playAudioBeep } from '@/src/utils/audio';
import { ToastNotification, ToastMessage } from '@/src/components/common/ToastNotification';
import { api, ApiClientError } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import { ApiResponse } from '@/src/types/api';
import {
  IInventoryTransactionItem,
  IProductLifecycleState,
  IReversalResponse,
  IAttachedComponentItem,
} from '@/src/types/inventory';

interface ReversalTarget {
  type: 'RECEIVE' | 'DELIVERY' | 'COMPONENT';
  transactionId?: string;
  productBarcode: string;
  productModel?: string;
  componentBarcode?: string;
  componentName?: string;
  pointName?: string;
  performedBy?: string;
  createdAt?: string;
}

const REASON_PRESETS = [
  'Physical intake inspection defect detected; returned to assembly bay',
  'Customer canceled delivery order before gate dispatch; restored to stock',
  'Incorrect modular component scanned during QA assembly; detached for re-binning',
  'Operator barcode scan error / duplicate key-in correction',
];

export default function ReversalsPage() {
  const { user } = useAuth();

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'CHASSIS' | 'LEDGER'>('CHASSIS');

  // Chassis Scan / Inspection State
  const [searchBarcode, setSearchBarcode] = useState('');
  const [chassisData, setChassisData] = useState<IProductLifecycleState | null>(null);
  const [chassisHistory, setChassisHistory] = useState<IInventoryTransactionItem[]>([]);
  const [loadingChassis, setLoadingChassis] = useState(false);

  // Global Ledger State
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [filterEventType, setFilterEventType] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState<IInventoryTransactionItem[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Reversal Execution Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<ReversalTarget | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [confirmedDisclaimer, setConfirmedDisclaimer] = useState(false);
  const [submittingReversal, setSubmittingReversal] = useState(false);
  const [reversalReceipt, setReversalReceipt] = useState<IReversalResponse | null>(null);

  // Toast
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Fetch Global Transactions
  const fetchLedger = useCallback(
    async (targetPage = 1, searchKeyword = ledgerSearch, eventType = filterEventType) => {
      setLoadingLedger(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(targetPage),
          limit: '15',
        });
        if (searchKeyword.trim()) queryParams.set('search', searchKeyword.trim());
        if (eventType && eventType !== 'ALL') queryParams.set('eventType', eventType);

        const res = await api.get<{
          success: boolean;
          data: IInventoryTransactionItem[];
          pagination: { total: number; page: number; limit: number; totalPages: number };
        }>(`/inventory/transactions?${queryParams.toString()}`);

        if (res.success && res.data) {
          setTransactions(res.data);
          setTotalTransactions(res.pagination?.total || 0);
          setTotalPages(res.pagination?.totalPages || 1);
          setPage(res.pagination?.page || 1);
        }
      } catch (err: unknown) {
        const msg = err instanceof ApiClientError ? err.message : 'Failed to load transaction ledger';
        setToast({ type: 'error', text: msg });
      } finally {
        setLoadingLedger(false);
      }
    },
    [ledgerSearch, filterEventType]
  );

  // Handle Chassis Scan Lookup
  const handleChassisSearch = async (e?: React.FormEvent, barcodeOverride?: string) => {
    if (e) e.preventDefault();
    const barcode = (barcodeOverride || searchBarcode).trim().toUpperCase();
    if (!barcode) {
      setToast({ type: 'error', text: 'Please enter or scan a product chassis barcode' });
      return;
    }

    setLoadingChassis(true);
    setReversalReceipt(null);

    try {
      // 1. Get lifecycle state
      const stateRes = await api.get<ApiResponse<IProductLifecycleState>>(
        `/inventory/product-scan/${barcode}`
      );

      // 2. Get history transactions
      const txRes = await api.get<{
        success: boolean;
        data: IInventoryTransactionItem[];
      }>(`/inventory/transactions?productBarcode=${barcode}&limit=50`);

      if (stateRes.success && stateRes.data) {
        setChassisData(stateRes.data);
        setSearchBarcode(barcode);
        playAudioBeep(880, 120);
      }

      if (txRes.success && txRes.data) {
        setChassisHistory(txRes.data);
      }

      setToast({
        type: 'info',
        text: `Loaded product lifecycle for '${barcode}' (${stateRes.data?.status || 'UNKNOWN'})`,
      });
    } catch (err: unknown) {
      playAudioBeep(330, 200);
      const msg = err instanceof ApiClientError ? err.message : 'Product lookup failed';
      setToast({ type: 'error', text: msg });
      setChassisData(null);
      setChassisHistory([]);
    } finally {
      setLoadingChassis(false);
    }
  };

  // Open Reversal Modal
  const openReversalModal = (target: ReversalTarget) => {
    setReversalTarget(target);
    setReversalReason('');
    setConfirmedDisclaimer(false);
    setIsModalOpen(true);
  };

  // Execute Reversal
  const handleExecuteReversal = async () => {
    if (!reversalTarget) return;

    if (reversalReason.trim().length < 10) {
      playAudioBeep(330, 200);
      setToast({
        type: 'error',
        text: 'Reversal reason is mandatory and must be at least 10 characters long.',
      });
      return;
    }

    if (!confirmedDisclaimer) {
      playAudioBeep(330, 200);
      setToast({
        type: 'error',
        text: 'Please confirm the audit trail disclaimer checkbox before proceeding.',
      });
      return;
    }

    setSubmittingReversal(true);

    try {
      let endpoint = '/inventory/reverse';
      const payload: Record<string, unknown> = {
        productBarcode: reversalTarget.productBarcode,
        reason: reversalReason.trim(),
      };

      if (reversalTarget.type === 'RECEIVE') {
        endpoint = '/inventory/reverse-receive';
        if (reversalTarget.transactionId) payload.transactionId = reversalTarget.transactionId;
      } else if (reversalTarget.type === 'DELIVERY') {
        endpoint = '/inventory/reverse-delivery';
        if (reversalTarget.transactionId) payload.transactionId = reversalTarget.transactionId;
      } else if (reversalTarget.type === 'COMPONENT') {
        endpoint = '/inventory/reverse-component';
        payload.componentBarcode = reversalTarget.componentBarcode;
      }

      const res = await api.post<ApiResponse<IReversalResponse>>(endpoint, payload);

      if (res.success && res.data) {
        playAudioBeep(880, 250);
        setReversalReceipt(res.data);
        setIsModalOpen(false);
        setToast({
          type: 'success',
          text: res.message || 'Transaction reversed successfully. Compensating ledger record created.',
        });

        // Refresh view
        if (chassisData && chassisData.productBarcode === reversalTarget.productBarcode) {
          handleChassisSearch(undefined, reversalTarget.productBarcode);
        }
        if (activeTab === 'LEDGER') {
          fetchLedger(page);
        }
      }
    } catch (err: unknown) {
      playAudioBeep(220, 300);
      const msg = err instanceof ApiClientError ? err.message : 'Reversal operation failed';
      setToast({ type: 'error', text: msg });
    } finally {
      setSubmittingReversal(false);
    }
  };

  // Helper: Status Badges
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse"></span>
            DELIVERED / DISPATCHED
          </span>
        );
      case 'IN_STOCK':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            IN STOCK / AVAILABLE
          </span>
        );
      case 'TRACKED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span>
            COMPONENTS TRACKED (NOT IN STOCK)
          </span>
        );
      case 'NEW_UNTRACKED':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            NEW / UNTRACKED
          </span>
        );
    }
  };

  // Helper: Event Type Badges
  const renderEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'RECEIVED':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            RECEIVED
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            DELIVERED
          </span>
        );
      case 'COMPONENT_TRACKED':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            COMPONENT TRACKED
          </span>
        );
      case 'REVERSED_RECEIVE':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            REVERSED RECEIVE
          </span>
        );
      case 'REVERSED_DELIVERY':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            REVERSED DELIVERY
          </span>
        );
      case 'REVERSED_COMPONENT':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            REVERSED COMPONENT
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {eventType}
          </span>
        );
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-rose-50 text-rose-800 border border-rose-200">
                  Compensating Reversals
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Append-Only Ledger
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <span>Transaction Reversals &amp; Corrections</span>
              </h1>
              <p className="text-xs text-slate-600">
                Administrative terminal to safely compensate inventory transactions with mandatory audit reasons, preserving complete ledger lineage.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/reports/audit-logs?action=TRANSACTION_REVERSED"
                className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Audit Logs Trail</span>
              </Link>
              {/* <div className="text-right pl-3 border-l border-slate-200 hidden sm:block">
                <p className="text-xs font-semibold text-slate-900">{user?.name || 'Administrator'}</p>
                <p className="text-xs text-slate-500 font-mono">Role: ADMIN ({user?.userCode})</p>
              </div> */}
            </div>
          </div>

          {/* Toast Notification */}
          <ToastNotification toast={toast} onClose={() => setToast(null)} />

          {/* Success Reversal Voucher Receipt */}
          {reversalReceipt && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-emerald-950">
                      Compensating Reversal Executed Successfully
                    </h3>
                    <p className="text-xs text-emerald-800">
                      Transaction Ledger updated. Original event preserved; new compensating document appended.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReversalReceipt(null)}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold p-1 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Dismiss</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-white/90 rounded-xl border border-emerald-200 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">Reversal Tx ID:</span>
                  <span className="font-bold text-slate-900">{reversalReceipt.reversalTransaction?._id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Product Chassis:</span>
                  <span className="font-bold text-slate-900">{reversalReceipt.productBarcode}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">New Product State:</span>
                  <span className="font-bold text-emerald-700">{reversalReceipt.status}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Downstream Result:</span>
                  <span className="font-bold text-slate-900">
                    {reversalReceipt.liberatedComponentBarcode
                      ? `Component ${reversalReceipt.liberatedComponentBarcode} Liberated`
                      : reversalReceipt.restoredToReceivePoint
                      ? `Restored to ${reversalReceipt.restoredToReceivePoint}`
                      : 'Stock Intake Canceled'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-emerald-800">
                <span>
                  <strong>Logged Reason:</strong> &ldquo;{reversalReceipt.reversalTransaction?.reason}&rdquo;
                </span>
                <span className="text-slate-500 font-mono">
                  Timestamp: {reversalReceipt.reversalTransaction?.createdAt ? new Date(reversalReceipt.reversalTransaction.createdAt).toLocaleString() : 'Just now'}
                </span>
              </div>
            </div>
          )}

          {/* Navigation View Switcher */}
          <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setActiveTab('CHASSIS')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-2 ${
                activeTab === 'CHASSIS'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Chassis Lifecycle &amp; Single-Unit Correction</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('LEDGER');
                fetchLedger(1);
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-2 ${
                activeTab === 'LEDGER'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Global Immutable Transaction Ledger &amp; Reversals</span>
            </button>
          </div>

          {/* ================================================================= */}
          {/* TAB 1: CHASSIS INSPECTION & CORRECTION                            */}
          {/* ================================================================= */}
          {activeTab === 'CHASSIS' && (
            <div className="space-y-6">
              {/* Barcode Search Form */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-rose-600" />
                  <span>Inspect Product Chassis Lifecycle</span>
                </h2>

                <form onSubmit={handleChassisSearch} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <ScanBarcode className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      value={searchBarcode}
                      onChange={(e) => setSearchBarcode(e.target.value.toUpperCase())}
                      placeholder="Scan with laser or enter product barcode (e.g. 2440701AK2057)..."
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-rose-500 focus:border-rose-500 uppercase placeholder:normal-case transition-all"
                      autoFocus
                    />
                    {searchBarcode && (
                      <button
                        type="button"
                        onClick={() => setSearchBarcode('')}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loadingChassis || !searchBarcode.trim()}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {loadingChassis ? (
                      <span className="flex items-center space-x-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Querying...</span>
                      </span>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Inspect Chassis</span>
                      </>
                    )}
                  </button>
                </form>
                <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                  <ScanBarcode className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Accepts laser barcode scan or keyboard input.</span>
                </p>
              </div>

              {/* Chassis Details Card */}
              {chassisData && (
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-6">
                  {/* Status Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h2 className="text-xl font-black font-mono text-slate-900">
                          {chassisData.productBarcode}
                        </h2>
                        {renderStatusBadge(chassisData.status)}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Model: <span className="font-semibold text-slate-700">{chassisData.productModel || 'Standard Chassis'}</span> • Total Ledger Events: <span className="font-semibold text-slate-700">{chassisData.historyCount}</span>
                      </p>
                    </div>

                    {/* Contextual Primary Action Button */}
                    <div>
                      {chassisData.status === 'DELIVERED' && (
                        <button
                          onClick={() =>
                            openReversalModal({
                              type: 'DELIVERY',
                              productBarcode: chassisData.productBarcode,
                              productModel: chassisData.productModel,
                              pointName: chassisData.deliveryInfo?.pointName,
                              performedBy: chassisData.deliveryInfo?.deliveredBy,
                              createdAt: chassisData.deliveryInfo?.deliveredAt,
                            })
                          }
                          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          <span>Reverse Delivery (Restore to Stock)</span>
                        </button>
                      )}

                      {chassisData.status === 'IN_STOCK' && (
                        <button
                          onClick={() =>
                            openReversalModal({
                              type: 'RECEIVE',
                              productBarcode: chassisData.productBarcode,
                              productModel: chassisData.productModel,
                              pointName: chassisData.currentReceivePoint?.pointName,
                              performedBy: chassisData.currentReceivePoint?.receivedBy,
                              createdAt: chassisData.currentReceivePoint?.receivedAt,
                            })
                          }
                          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          <span>Reverse Receiving (Remove from Stock)</span>
                        </button>
                      )}

                      {chassisData.status === 'TRACKED' && (
                        <span className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Components Bound (Eligible for Individual Detachment)</span>
                        </span>
                      )}

                      {chassisData.status === 'NEW_UNTRACKED' && (
                        <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                          No active reversible operations on this chassis
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Operational Notes / Invariant Warning */}
                  {chassisData.status === 'DELIVERED' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-blue-600" />
                        <span>Delivered Product Reversal Workflow:</span>
                      </p>
                      <p>
                        To detach components or reverse initial warehouse intake for this chassis, you must first execute a <strong>Delivery Reversal</strong> to restore the unit into available warehouse inventory.
                      </p>
                    </div>
                  )}

                  {chassisData.status === 'IN_STOCK' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-emerald-600" />
                        <span>In-Stock Product Reversal Workflow:</span>
                      </p>
                      <p>
                        Current location: <strong>{chassisData.currentReceivePoint?.pointName || 'Warehouse Receiving Bay'}</strong>. To detach modular components, you must first execute a <strong>Receive Reversal</strong> to transition the chassis back to TRACKED state.
                      </p>
                    </div>
                  )}

                  {/* Modular Components Table */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                      <span>Attached Modular Components ({chassisData.attachedComponents?.length || 0})</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        Component detachment requires status: TRACKED
                      </span>
                    </h3>

                    {chassisData.attachedComponents && chassisData.attachedComponents.length > 0 ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                            <tr>
                              <th className="px-4 py-2.5 text-left">Component Barcode</th>
                              <th className="px-4 py-2.5 text-left">Component Name</th>
                              <th className="px-4 py-2.5 text-left">Attached Date</th>
                              <th className="px-4 py-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {chassisData.attachedComponents.map((comp: IAttachedComponentItem) => (
                              <tr key={comp.componentBarcode} className="hover:bg-slate-50/60">
                                <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                                  {comp.componentBarcode}
                                </td>
                                <td className="px-4 py-2.5 text-slate-700">{comp.componentName}</td>
                                <td className="px-4 py-2.5 text-slate-500 font-mono">
                                  {new Date(comp.attachedAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    disabled={chassisData.status !== 'TRACKED'}
                                    onClick={() =>
                                      openReversalModal({
                                        type: 'COMPONENT',
                                        productBarcode: chassisData.productBarcode,
                                        componentBarcode: comp.componentBarcode,
                                        componentName: comp.componentName,
                                      })
                                    }
                                    title={
                                      chassisData.status !== 'TRACKED'
                                        ? 'Reverse receiving/delivery first before detaching components'
                                        : 'Detach component from chassis and restore serial for re-use'
                                    }
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                  >
                                    Detach & Liberate
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No active components currently bound to this chassis.
                      </p>
                    )}
                  </div>

                  {/* Chassis History Timeline */}
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Chassis Ledger Timeline ({chassisHistory.length} events)
                    </h3>

                    <div className="space-y-2">
                      {chassisHistory.map((tx) => (
                        <div
                          key={tx._id}
                          className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            tx.isReversalEvent
                              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                              : tx.isReversed
                              ? 'bg-slate-50 border-slate-200 text-slate-500 line-through'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            {renderEventBadge(tx.eventType)}
                            <div>
                              <p className="font-mono font-semibold">
                                {tx.pointName || 'Station Point'} • {tx.userName} ({tx.userCode})
                              </p>
                              {tx.reason && (
                                <p className="text-[11px] text-slate-600 mt-0.5 not-italic">
                                  <strong>Reason:</strong> &ldquo;{tx.reason}&rdquo;
                                </p>
                              )}
                              {tx.reversalInfo && (
                                <p className="text-[11px] text-amber-700 font-semibold not-italic">
                                  Reversed on {new Date(tx.reversalInfo.reversedAt).toLocaleDateString()} by{' '}
                                  {tx.reversalInfo.reversedBy}: &ldquo;{tx.reversalInfo.reason}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right text-slate-400 font-mono text-[11px]">
                            {new Date(tx.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: GLOBAL TRANSACTION LEDGER & REVERSAL BROWSER               */}
          {/* ================================================================= */}
          {activeTab === 'LEDGER' && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-6">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div className="flex-1 w-full sm:max-w-md relative">
                  <input
                    type="text"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchLedger(1)}
                    placeholder="Search chassis, component, operator, or bay..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                  {ledgerSearch && (
                    <button
                      onClick={() => {
                        setLedgerSearch('');
                        fetchLedger(1, '');
                      }}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                  {['ALL', 'RECEIVED', 'DELIVERED', 'COMPONENT_TRACKED', 'REVERSALS'].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setFilterEventType(type);
                        fetchLedger(1, ledgerSearch, type);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        filterEventType === type
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {type === 'COMPONENT_TRACKED' ? 'COMPONENTS' : type}
                    </button>
                  ))}
                  <button
                    onClick={() => fetchLedger(page)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs cursor-pointer"
                    title="Refresh Ledger"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Timestamp / Tx ID</th>
                      <th className="px-4 py-3 text-left">Product Chassis</th>
                      <th className="px-4 py-3 text-left">Event Type</th>
                      <th className="px-4 py-3 text-left">Location / Component</th>
                      <th className="px-4 py-3 text-left">Operator</th>
                      <th className="px-4 py-3 text-left">Ledger Status</th>
                      <th className="px-4 py-3 text-right">Reversal Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {loadingLedger ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          <span className="inline-block w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mr-2"></span>
                          Loading transactions from MongoDB ledger...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                          No transactions found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr
                          key={tx._id}
                          className={`hover:bg-slate-50/70 ${
                            tx.isReversalEvent
                              ? 'bg-amber-50/30'
                              : tx.isReversed
                              ? 'bg-slate-50/50 opacity-75'
                              : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-slate-500 block">
                              {new Date(tx.createdAt).toLocaleString()}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {tx._id}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setSearchBarcode(tx.productBarcode);
                                setActiveTab('CHASSIS');
                                handleChassisSearch(undefined, tx.productBarcode);
                              }}
                              className="font-mono font-bold text-rose-700 hover:text-rose-900 hover:underline block text-left"
                            >
                              {tx.productBarcode}
                            </button>
                            <span className="text-[11px] text-slate-500">{tx.productModel}</span>
                          </td>

                          <td className="px-4 py-3">{renderEventBadge(tx.eventType)}</td>

                          <td className="px-4 py-3">
                            {tx.pointName && (
                              <span className="block font-medium text-slate-800">{tx.pointName}</span>
                            )}
                            {tx.componentBarcode && (
                              <span className="block font-mono text-[11px] text-purple-700">
                                {tx.componentName || 'Comp'}: {tx.componentBarcode}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800 block">{tx.userName}</span>
                            <span className="font-mono text-[11px] text-slate-500">{tx.userCode}</span>
                          </td>

                          <td className="px-4 py-3">
                            {tx.isReversalEvent ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                                Compensating Record
                              </span>
                            ) : tx.isReversed ? (
                              <div>
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                                  Reversed
                                </span>
                                {tx.reversalInfo && (
                                  <span className="block text-[10px] text-slate-500 mt-0.5">
                                    By {tx.reversalInfo.reversedBy}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Active In Ledger
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            {tx.isReversible ? (
                              <button
                                onClick={() =>
                                  openReversalModal({
                                    type:
                                      tx.eventType === 'RECEIVED'
                                        ? 'RECEIVE'
                                        : tx.eventType === 'DELIVERED'
                                        ? 'DELIVERY'
                                        : 'COMPONENT',
                                    transactionId: tx._id,
                                    productBarcode: tx.productBarcode,
                                    productModel: tx.productModel,
                                    componentBarcode: tx.componentBarcode,
                                    componentName: tx.componentName,
                                    pointName: tx.pointName,
                                    performedBy: tx.userName,
                                    createdAt: tx.createdAt,
                                  })
                                }
                                className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                              >
                                Reverse Event
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">
                                {tx.isReversalEvent ? 'Ledger Compensator' : 'Already Reversed'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="flex items-center justify-between text-xs text-slate-600 pt-2">
                <span>
                  Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalTransactions} total entries)
                </span>
                <div className="flex space-x-2">
                  <button
                    disabled={page <= 1 || loadingLedger}
                    onClick={() => fetchLedger(page - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages || loadingLedger}
                    onClick={() => fetchLedger(page + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* REVERSAL EXECUTION MODAL                                          */}
          {/* ================================================================= */}
          {isModalOpen && reversalTarget && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Confirm Compensating Reversal
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Target Operation Details */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Operation Type:</span>
                    <span className="font-bold text-rose-700 uppercase">
                      {reversalTarget.type === 'RECEIVE'
                        ? 'Receive Reversal'
                        : reversalTarget.type === 'DELIVERY'
                        ? 'Delivery Reversal'
                        : 'Component Detachment Reversal'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Product Chassis:</span>
                    <span className="font-bold text-slate-900">{reversalTarget.productBarcode}</span>
                  </div>
                  {reversalTarget.componentBarcode && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Modular Component:</span>
                      <span className="font-bold text-purple-700">
                        {reversalTarget.componentName} ({reversalTarget.componentBarcode})
                      </span>
                    </div>
                  )}
                  {reversalTarget.transactionId && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Target Tx ID:</span>
                      <span className="text-slate-600">{reversalTarget.transactionId}</span>
                    </div>
                  )}
                </div>

                {/* Downstream Impact Alert */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                    <span>Downstream State Recalculation:</span>
                  </p>
                  <p>
                    {reversalTarget.type === 'RECEIVE' &&
                      'This product will be immediately removed from available warehouse stock and returned to TRACKED state. The original receive transaction is preserved immutably.'}
                    {reversalTarget.type === 'DELIVERY' &&
                      'This product will leave DELIVERED status and be restored to available warehouse inventory at its original receive bay.'}
                    {reversalTarget.type === 'COMPONENT' &&
                      'The component serial will be unbound from the chassis and liberated. It can then be re-assigned or re-binned.'}
                  </p>
                </div>

                {/* Mandatory Reason Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">
                      Mandatory Audit Reason <span className="text-rose-600">*</span>
                    </label>
                    <span
                      className={`text-[11px] font-mono ${
                        reversalReason.trim().length >= 10 ? 'text-emerald-600 font-bold' : 'text-rose-600'
                      }`}
                    >
                      {reversalReason.trim().length} / 10 chars min
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                    placeholder="Provide a detailed operational justification for this correction (min 10 characters)..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />

                  {/* Preset Suggestions */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      Quick Preset Justifications:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {REASON_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setReversalReason(preset)}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md border border-slate-200 transition-colors text-left"
                        >
                          {preset.slice(0, 45)}...
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Audit Disclaimer Checkbox */}
                <label className="flex items-start space-x-2.5 cursor-pointer text-xs text-slate-600 pt-1">
                  <input
                    type="checkbox"
                    checked={confirmedDisclaimer}
                    onChange={(e) => setConfirmedDisclaimer(e.target.checked)}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                  />
                  <span>
                    I acknowledge that this action will append an immutable compensating transaction to the audit ledger under operator code <strong>{user?.userCode}</strong>.
                  </span>
                </label>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={
                      submittingReversal ||
                      reversalReason.trim().length < 10 ||
                      !confirmedDisclaimer
                    }
                    onClick={handleExecuteReversal}
                    className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
                  >
                    {submittingReversal ? (
                      <span className="flex items-center space-x-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Executing Reversal...</span>
                      </span>
                    ) : (
                      <>
                        <Undo2 className="w-3.5 h-3.5 mr-1" />
                        <span>Confirm &amp; Execute Reversal</span>
                      </>
                    )}
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
