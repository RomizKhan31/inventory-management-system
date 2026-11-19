'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Download,
  Camera,
  CheckCircle2,
  Clock,
  RotateCcw,
  FileText,
  X,
  RefreshCw,
} from 'lucide-react';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { CameraBarcodeScannerModal, playAudioBeep } from '@/src/components/scanner/CameraBarcodeScannerModal';
import { ToastNotification, ToastMessage } from '@/src/components/common/ToastNotification';
import { api, ApiClientError, getToken } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import { IBarcodeHistoryReportData } from '@/src/types/inventory';

function BarcodeHistoryContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Search State
  const [barcodeInput, setBarcodeInput] = useState(() => searchParams.get('barcode') || '');
  const [data, setData] = useState<IBarcodeHistoryReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Fetch Barcode History
  const fetchHistory = useCallback(async (barcodeToSearch: string) => {
    const raw = barcodeToSearch.trim().toUpperCase();
    if (!raw || raw.length < 3) {
      setToast({ type: 'error', text: 'Please enter a valid barcode (minimum 3 characters)' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        data: IBarcodeHistoryReportData;
      }>(`/reports/barcode-history/${raw}`);

      if (res.success && res.data) {
        setData(res.data);
        setBarcodeInput(raw);
        playAudioBeep(880, 150);
      }
    } catch (err: unknown) {
      playAudioBeep(330, 200);
      const msg = err instanceof ApiClientError ? err.message : 'Failed to retrieve barcode history';
      setToast({ type: 'error', text: msg });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize from URL search parameter if present
  useEffect(() => {
    let isMounted = true;
    const urlBarcode = searchParams.get('barcode');
    if (!urlBarcode) return;

    const loadHistory = async () => {
      try {
        const raw = urlBarcode.trim().toUpperCase();
        const res = await api.get<{
          success: boolean;
          data: IBarcodeHistoryReportData;
        }>(`/reports/barcode-history/${raw}`);

        if (isMounted && res.success && res.data) {
          setData(res.data);
          playAudioBeep(880, 150);
        }
      } catch (err: unknown) {
        if (isMounted) {
          playAudioBeep(330, 200);
          const msg = err instanceof ApiClientError ? err.message : 'Failed to retrieve barcode history';
          setToast({ type: 'error', text: msg });
        }
      }
    };

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory(barcodeInput);
  };

  // Export CSV
  const handleExportCsv = async () => {
    if (!data) return;

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/reports/export?reportType=barcode-history&barcode=${data.productBarcode}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Export request failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `walton_lifecycle_${data.productBarcode}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setToast({ type: 'success', text: 'Barcode history lifecycle exported successfully to CSV.' });
    } catch {
      setToast({ type: 'error', text: 'Failed to download barcode lifecycle export.' });
    }
  };

  // Helper: Event Type Badges
  const renderEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'RECEIVED':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            WAREHOUSE RECEIVED
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            PRODUCT DELIVERED
          </span>
        );
      case 'COMPONENT_TRACKED':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            COMPONENT TRACKED
          </span>
        );
      case 'REVERSED_RECEIVE':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            REVERSED RECEIVE
          </span>
        );
      case 'REVERSED_DELIVERY':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            REVERSED DELIVERY
          </span>
        );
      case 'REVERSED_COMPONENT':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            REVERSED COMPONENT
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {eventType}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-purple-50 text-purple-800 border border-purple-200">
                Traceability Report
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Immutable Chronological Ledger
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Search className="w-5 h-5 text-purple-600" />
              <span>Barcode-Wise Full Lifecycle Journey</span>
            </h1>
            <p className="text-xs text-slate-600">
              Query any product chassis barcode to inspect its entire chronological audit trail: component binding, stock admission, gate delivery, and administrative reversals.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {data && (
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}
            <div className="text-right pl-3 border-l border-slate-200 hidden sm:block">
              <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500 font-mono">Role: {user?.role}</p>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        <ToastNotification toast={toast} onClose={() => setToast(null)} />

        {/* Barcode Search Box */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value.toUpperCase())}
                placeholder="Enter or scan product chassis barcode (e.g. 2440701AK2057)..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500 uppercase placeholder:normal-case"
              />
              {barcodeInput && (
                <button
                  type="button"
                  onClick={() => setBarcodeInput('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl border border-slate-300 transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Scan</span>
            </button>

            <button
              type="submit"
              disabled={loading || !barcodeInput.trim()}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center space-x-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Tracing...</span>
                </span>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Trace Journey</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Lifecycle Stepper & Overview Card */}
        {data && (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-6">
              {/* Chassis Info Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-2xl font-black font-mono text-slate-900">
                      {data.productBarcode}
                    </h2>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                        data.currentStatus === 'IN_STOCK'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : data.currentStatus === 'DELIVERED'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : data.currentStatus === 'TRACKED'
                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {data.currentStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Model: <strong className="text-slate-800">{data.productModel}</strong> • Total Ledger Events:{' '}
                    <strong className="text-slate-800">{data.summary.totalEvents}</strong> • Reversals:{' '}
                    <strong className="text-amber-700">{data.summary.reversalEventsCount}</strong>
                  </p>
                </div>

                <div className="text-right text-xs">
                  {data.stockLocation && (
                    <span className="block text-emerald-800 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      Stock Bay: {data.stockLocation}
                    </span>
                  )}
                  {data.dispatchLocation && (
                    <span className="block text-blue-800 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                      Dispatched Dock: {data.dispatchLocation}
                    </span>
                  )}
                </div>
              </div>

              {/* Visual 3-Stage Lifecycle Stepper */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Stage 1: Component Tracking */}
                <div
                  className={`p-4 rounded-xl border ${
                    data.lifecycleStages.componentTracking.isComplete
                      ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      1. Component Tracking
                    </span>
                    <div>
                      {data.lifecycleStages.componentTracking.isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-purple-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs">
                    {data.lifecycleStages.componentTracking.activeComponentsCount} Active Components Bound
                  </p>
                  {data.lifecycleStages.componentTracking.completedAt && (
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      {new Date(data.lifecycleStages.componentTracking.completedAt).toLocaleString()}
                    </p>
                  )}
                  {data.lifecycleStages.componentTracking.isReversed && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                      Reversal Recorded
                    </span>
                  )}
                </div>

                {/* Stage 2: Product Receiving */}
                <div
                  className={`p-4 rounded-xl border ${
                    data.lifecycleStages.receiving.isComplete
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : data.lifecycleStages.receiving.isReversed
                      ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      2. Warehouse Receiving
                    </span>
                    <div>
                      {data.lifecycleStages.receiving.isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : data.lifecycleStages.receiving.isReversed ? (
                        <RotateCcw className="w-5 h-5 text-amber-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs">
                    {data.lifecycleStages.receiving.receivePoint || 'Intake Pending'}
                  </p>
                  {data.lifecycleStages.receiving.receivedAt && (
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      {new Date(data.lifecycleStages.receiving.receivedAt).toLocaleString()}
                    </p>
                  )}
                  {data.lifecycleStages.receiving.isReversed && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                      Receiving Reversed (Removed from Stock)
                    </span>
                  )}
                </div>

                {/* Stage 3: Product Delivery */}
                <div
                  className={`p-4 rounded-xl border ${
                    data.lifecycleStages.delivery.isComplete
                      ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                      : data.lifecycleStages.delivery.isReversed
                      ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      3. Warehouse Delivery
                    </span>
                    <div>
                      {data.lifecycleStages.delivery.isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      ) : data.lifecycleStages.delivery.isReversed ? (
                        <RotateCcw className="w-5 h-5 text-amber-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs">
                    {data.lifecycleStages.delivery.deliveryPoint || 'Dispatch Pending'}
                  </p>
                  {data.lifecycleStages.delivery.deliveredAt && (
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      {new Date(data.lifecycleStages.delivery.deliveredAt).toLocaleString()}
                    </p>
                  )}
                  {data.lifecycleStages.delivery.isReversed && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                      Delivery Reversed (Restored to Stock)
                    </span>
                  )}
                </div>
              </div>

              {/* Attached Components List */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Active Modular Components ({data.activeComponents.length})
                </h3>
                {data.activeComponents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.activeComponents.map((comp) => (
                      <div
                        key={comp.componentBarcode}
                        className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 text-xs flex justify-between items-center"
                      >
                        <div>
                          <span className="font-semibold text-slate-900 block">{comp.componentName}</span>
                          <span className="font-mono text-purple-700 block">{comp.componentBarcode}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new Date(comp.attachedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No active modular components bound to this chassis.
                  </p>
                )}
              </div>
            </div>

            {/* Chronological Lifecycle Timeline */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>Chronological Transaction Ledger Journey ({data.eventsTimeline.length} events)</span>
              </h3>

              <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pl-6">
                {data.eventsTimeline.map((ev) => (
                  <div key={ev._id} className="relative group">
                    {/* Stepper Dot */}
                    <div
                      className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 bg-white ${
                        ev.isReversalEvent
                          ? 'border-amber-500'
                          : ev.isReversed
                          ? 'border-rose-400'
                          : 'border-emerald-500'
                      }`}
                    ></div>

                    <div
                      className={`p-4 rounded-xl border text-xs space-y-2 ${
                        ev.isReversalEvent
                          ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                          : ev.isReversed
                          ? 'bg-slate-50/80 border-slate-200 text-slate-600'
                          : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-slate-400 font-mono">
                            Step #{ev.stepNumber}
                          </span>
                          {renderEventBadge(ev.eventType)}
                          <span className="font-semibold text-slate-800">{ev.pointName}</span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {new Date(ev.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-slate-500">Operator: </span>
                          <span className="font-semibold">{ev.userName}</span> ({ev.userCode})
                        </div>
                        {ev.componentBarcode && (
                          <div>
                            <span className="text-slate-500">Component: </span>
                            <span className="font-mono font-semibold text-purple-700">
                              {ev.componentName}: {ev.componentBarcode}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Reversal Annotation Callout */}
                      {ev.isReversed && ev.reversalDetails && (
                        <div className="mt-2 p-3 bg-amber-100/70 border border-amber-300 rounded-lg text-amber-950 text-[11px] space-y-1">
                          <p className="font-bold flex items-center gap-1">
                            <span>↩️</span>
                            <span>Operation Compensated / Reversed</span>
                          </p>
                          <p>
                            Reversed by <strong>{ev.reversalDetails.reversedBy}</strong> (
                            {ev.reversalDetails.reversedByUserCode}) on{' '}
                            {new Date(ev.reversalDetails.reversedAt).toLocaleString()}
                          </p>
                          <p>
                            <strong>Reason:</strong> &ldquo;{ev.reversalDetails.reason}&rdquo;
                          </p>
                        </div>
                      )}

                      {/* If this transaction is itself a reversal */}
                      {ev.isReversalEvent && ev.reason && (
                        <div className="mt-2 p-2.5 bg-amber-100/50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
                          <strong>Logged Administrative Reason:</strong> &ldquo;{ev.reason}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Camera Barcode Scanner Modal */}
        <CameraBarcodeScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={(decodedText) => {
            setBarcodeInput(decodedText);
            setIsScannerOpen(false);
            fetchHistory(decodedText);
          }}
        />
      </div>
    </div>
  );
}

export default function BarcodeHistoryPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'REPORT_VIEWER']}>
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
            <span className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-3"></span>
            <span className="text-slate-600 text-xs font-semibold">Loading Barcode History Workstation...</span>
          </div>
        }
      >
        <BarcodeHistoryContent />
      </Suspense>
    </ProtectedRoute>
  );
}
