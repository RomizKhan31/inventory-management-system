'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Camera,
  RotateCcw,
  Zap,
  Check,
  Search,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { CameraBarcodeScannerModal, playAudioBeep } from '@/src/components/scanner/CameraBarcodeScannerModal';
import { ToastNotification, ToastMessage } from '@/src/components/common/ToastNotification';
import { api, ApiClientError } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import { ApiResponse } from '@/src/types/api';
import { IReceivePointItem } from '@/src/types/admin';

interface AttachedComponentItem {
  _id?: string;
  componentBarcode: string;
  componentName: string;
  attachedAt: string;
  attachedBy?: string;
}

interface ProductScanResult {
  productBarcode: string;
  status: 'NEW_UNTRACKED' | 'TRACKED' | 'IN_STOCK' | 'DELIVERED' | string;
  productModel?: string;
  productId?: string;
  canAttachComponents: boolean;
  blockReason?: string;
  hasActiveComponents: boolean;
  isCurrentlyReceived: boolean;
  isCurrentlyDelivered: boolean;
  attachedComponents: AttachedComponentItem[];
  historyCount: number;
}

interface ReceiveResult {
  message: string;
  status: string;
  productBarcode: string;
  productModel: string;
  receivePoint: {
    id: string;
    pointCode: string;
    name: string;
    location?: string;
  };
  transaction: {
    _id: string;
    eventType: string;
    pointName: string;
    userCode: string;
    userName: string;
    createdAt: string;
  };
  attachedComponentsCount: number;
  attachedComponents: AttachedComponentItem[];
}

export default function ProductReceivingPage() {
  const { user } = useAuth();

  // Scanning State
  const [productBarcode, setProductBarcode] = useState('');
  const [productData, setProductData] = useState<ProductScanResult | null>(null);

  // Receive Point Selection
  const [receivePoints, setReceivePoints] = useState<IReceivePointItem[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string>('');
  const [stationNotes, setStationNotes] = useState('');

  // UI / Action State
  const [loading, setLoading] = useState(false);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [warningAlert, setWarningAlert] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [receiveSuccessReceipt, setReceiveSuccessReceipt] = useState<ReceiveResult | null>(null);

  // Load active receive points on mount
  useEffect(() => {
    let isMounted = true;
    const fetchReceivePoints = async () => {
      try {
        const res = await api.get<ApiResponse<IReceivePointItem[]>>('/inventory/receive-points');
        if (isMounted && res.success && res.data && res.data.length > 0) {
          setReceivePoints(res.data);
          setSelectedPointId(res.data[0]._id);
        }
      } catch {
        // Fallback default points if network delays
        if (isMounted) {
          const fallbackPoints: IReceivePointItem[] = [
            {
              _id: 'RP_FALLBACK_1',
              pointCode: 'RP-REF-01',
              name: 'Refrigerator Receive Point 1',
              location: 'Warehouse Bay 1 - Finished Goods Intake',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              _id: 'RP_FALLBACK_2',
              pointCode: 'RP-AC-02',
              name: 'Air Conditioner Receive Point 2',
              location: 'Warehouse Bay 2 - HVAC Staging',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];
          setReceivePoints(fallbackPoints);
          setSelectedPointId(fallbackPoints[0]._id);
        }
      }
    };

    fetchReceivePoints();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Submit Product Barcode Scan & Validate Prerequisites
  const handleProductScanSubmit = async (e?: React.FormEvent, barcodeOverride?: string) => {
    if (e) e.preventDefault();
    const barcodeToVerify = (barcodeOverride || productBarcode).trim().toUpperCase();

    if (!barcodeToVerify) {
      setToast({ type: 'error', text: 'Please enter or scan a product barcode' });
      return;
    }

    setLoading(true);
    setWarningAlert(null);
    setReceiveSuccessReceipt(null);

    try {
      const res = await api.get<ApiResponse<ProductScanResult>>(
        `/inventory/product-scan/${barcodeToVerify}`
      );

      if (res.success && res.data) {
        const data = res.data;
        setProductData(data);
        setProductBarcode(barcodeToVerify);

        // Evaluate Receiving Business Rules
        if (!data.hasActiveComponents || data.attachedComponents.length === 0) {
          playAudioBeep(330, 300);
          setWarningAlert(
            'Prerequisite Check Failed: Chassis has not completed Component Tracking. All modular components must be bound before warehouse stock admission.'
          );
        } else if (data.isCurrentlyReceived) {
          playAudioBeep(330, 300);
          setWarningAlert(
            'Product is already in warehouse inventory stock. Duplicate receiving is strictly prohibited.'
          );
        } else if (data.isCurrentlyDelivered) {
          playAudioBeep(330, 300);
          setWarningAlert(
            'Product has already been dispatched/delivered from warehouse stock. Re-intake requires an administrative reversal workflow.'
          );
        } else {
          // Success: Product is eligible for warehouse intake
          playAudioBeep(880, 150);
          setToast({
            type: 'success',
            text: `Chassis verified: ${data.attachedComponents.length} components bound. Ready for receiving.`,
          });
        }
      }
    } catch (err: unknown) {
      playAudioBeep(220, 350);
      const msg = err instanceof ApiClientError ? err.message : 'Product verification failed';
      setToast({ type: 'error', text: msg });
      setProductData(null);
    } finally {
      setLoading(false);
    }
  };

  // 2. Open Receive Confirmation Modal
  const handleOpenConfirmation = () => {
    if (!productData) {
      setToast({ type: 'error', text: 'Please scan and verify a product barcode first' });
      return;
    }

    if (!productData.hasActiveComponents) {
      setWarningAlert(
        'Cannot receive product: Component tracking prerequisite not completed.'
      );
      return;
    }

    if (productData.isCurrentlyReceived) {
      setWarningAlert('Product is already in stock.');
      return;
    }

    if (productData.isCurrentlyDelivered) {
      setWarningAlert('Product is currently delivered. Re-receiving without reversal is prohibited.');
      return;
    }

    if (!selectedPointId) {
      setToast({ type: 'error', text: 'Please select a valid warehouse receive point' });
      return;
    }

    setIsConfirmDialogOpen(true);
  };

  // 3. Confirm and Execute Atomic Receiving Transaction
  const handleConfirmReceive = async () => {
    if (!productData || !selectedPointId) return;

    setReceiveLoading(true);
    try {
      const res = await api.post<ApiResponse<ReceiveResult>>('/inventory/receive-product', {
        productBarcode: productData.productBarcode,
        receivePointId: selectedPointId,
        notes: stationNotes.trim() || undefined,
      });

      if (res.success && res.data) {
        playAudioBeep(987, 250); // Pleasant high success chime
        setReceiveSuccessReceipt(res.data);
        setIsConfirmDialogOpen(false);
        setToast({
          type: 'success',
          text: `Product ${res.data.productBarcode} admitted into stock at ${res.data.receivePoint.name}!`,
        });

        // Update active scan state
        setProductData((prev) =>
          prev
            ? {
                ...prev,
                status: 'IN_STOCK',
                isCurrentlyReceived: true,
                historyCount: prev.historyCount + 1,
              }
            : null
        );
        setStationNotes('');
      }
    } catch (err: unknown) {
      playAudioBeep(220, 400);
      const msg = err instanceof ApiClientError ? err.message : 'Receiving transaction failed';
      setToast({ type: 'error', text: msg });
      if (msg.toLowerCase().includes('already in stock') || msg.toLowerCase().includes('duplicate')) {
        setWarningAlert(`CONCURRENCY RESTRICTION: ${msg}`);
      }
    } finally {
      setReceiveLoading(false);
    }
  };

  // Reset Station State
  const handleResetStation = () => {
    setProductBarcode('');
    setProductData(null);
    setWarningAlert(null);
    setToast(null);
    setStationNotes('');
    setReceiveSuccessReceipt(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'TRACKED':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'IN_STOCK':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'DELIVERED':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'NEW_UNTRACKED':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const selectedPoint = receivePoints.find((p) => p._id === selectedPointId);

  // Can execute receive if product is tracked and not currently in stock or delivered
  const canReceive =
    productData &&
    productData.hasActiveComponents &&
    !productData.isCurrentlyReceived &&
    !productData.isCurrentlyDelivered &&
    productData.status === 'TRACKED';

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'RECEIVE_USER']}>
      <div className="space-y-6">
        {/* Workstation Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Warehouse Intake Operations
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Product Receiving
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Product Receiving Bay
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verify serialized component tracking prerequisites and admit finished units into warehouse stock at authorized receiving points.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900">{user?.name}</p>
              <p className="text-[11px] font-mono text-slate-500">
                Badge: {user?.userCode} ({user?.role})
              </p>
            </div>
            <button
              onClick={handleResetStation}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Station</span>
            </button>
          </div>
        </div>

        {/* Notifications & Warning Alerts */}
        <ToastNotification toast={toast} onClose={() => setToast(null)} />

        {warningAlert && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs shadow-xs space-y-1">
            <div className="flex items-center space-x-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Operational Prerequisite Alert</span>
            </div>
            <p className="leading-relaxed pl-6">{warningAlert}</p>
          </div>
        )}

        {/* Success Receipt Banner (When Unit Received) */}
        {receiveSuccessReceipt && (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-200 pb-3">
              <div className="flex items-center space-x-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-emerald-900">
                    Product Successfully Admitted to Stock
                  </h3>
                  <p className="text-xs text-emerald-700">
                    Ledger transaction #{receiveSuccessReceipt.transaction._id} recorded
                  </p>
                </div>
              </div>
              <button
                onClick={handleResetStation}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Scan Next Unit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Product Barcode</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {receiveSuccessReceipt.productBarcode}
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Product Model</span>
                <span className="font-bold text-slate-900 text-sm">
                  {receiveSuccessReceipt.productModel}
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Receive Location</span>
                <span className="font-bold text-slate-900 text-sm">
                  {receiveSuccessReceipt.receivePoint.name}
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Stock Status</span>
                <span className="inline-block px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 text-xs">
                  IN_STOCK
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main Workstation 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Barcode Scanning & Receive Point Selection (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: SCAN PRODUCT CHASSIS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Product Chassis Barcode
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const testBarcode = '2440701AK2057';
                    setProductBarcode(testBarcode);
                    handleProductScanSubmit(undefined, testBarcode);
                  }}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  <span>Sample Chassis (2440701AK2057)</span>
                </button>
              </div>

              <form onSubmit={handleProductScanSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Scan or Enter Product Chassis Barcode
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="e.g. 2440701AK2057"
                      value={productBarcode}
                      onChange={(e) => setProductBarcode(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 uppercase font-mono font-bold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shrink-0"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Camera</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !productBarcode.trim()}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
                    >
                      <span>{loading ? 'Verifying...' : 'Verify Chassis'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Accepts laser barcode scan, camera scanner, or keyboard input.
                  </p>
                </div>
              </form>
            </div>

            {/* Step 2: DESTINATION RECEIVE POINT SELECTOR */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Warehouse Receive Point
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Receiving Bay / Dock
                  </label>
                  <select
                    value={selectedPointId}
                    onChange={(e) => setSelectedPointId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 font-semibold text-slate-900 cursor-pointer"
                  >
                    {receivePoints.map((pt) => (
                      <option key={pt._id} value={pt._id}>
                        {pt.pointCode} - {pt.name} {pt.location ? `(${pt.location})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Point Preview Box */}
                {selectedPoint && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{selectedPoint.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {selectedPoint.pointCode}
                      </span>
                    </div>
                    {selectedPoint.location && (
                      <p className="text-slate-500 text-[11px] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>Location: {selectedPoint.location}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Station Shift / Pallet Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Station / Batch Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Morning Shift, Pallet #18, Quality Tag OK"
                    value={stationNotes}
                    onChange={(e) => setStationNotes(e.target.value)}
                    maxLength={200}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: INTAKE ACTION BUTTON */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                {canReceive ? (
                  <span className="text-emerald-700 font-bold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>All prerequisites satisfied. Ready to admit unit to stock.</span>
                  </span>
                ) : (
                  <span className="text-slate-400">
                    Scan and verify an eligible tracked chassis above to enable intake.
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleOpenConfirmation}
                disabled={!canReceive || receiveLoading}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                <span>{receiveLoading ? 'Processing...' : 'Admit Unit Into Stock'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: Live Product Validation & Bill of Materials (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Chassis Status &amp; Components (BOM)
                </h3>
                {productData && (
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${getStatusBadge(
                      productData.status
                    )}`}
                  >
                    {productData.status}
                  </span>
                )}
              </div>

              {productData ? (
                <div className="space-y-4">
                  {/* Product Specification Card */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Product Barcode:</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {productData.productBarcode}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Model / Family:</span>
                      <span className="font-bold text-slate-900">
                        {productData.productModel || 'Refrigerator'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Ledger Event Count:</span>
                      <span className="font-mono text-slate-600 font-semibold">
                        {productData.historyCount} Transactions
                      </span>
                    </div>
                  </div>

                  {/* Component Tracking Validation Box */}
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      productData.hasActiveComponents
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        {productData.hasActiveComponents ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Component Tracking Verified</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            <span>Component Tracking Missing</span>
                          </>
                        )}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          productData.hasActiveComponents
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {productData.attachedComponents.length} Bound
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {productData.hasActiveComponents
                        ? 'Chassis has completed serialized assembly tracking. Ready for warehouse inventory receipt.'
                        : 'This chassis has zero attached sub-assemblies. Return to Assembly Line Component Tracking station.'}
                    </p>
                  </div>

                  {/* Attached Sub-Assemblies Table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 mb-2">
                      Attached Modular Components:
                    </h4>
                    {productData.attachedComponents.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No sub-assembly components attached to this chassis yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {productData.attachedComponents.map((comp, idx) => (
                          <div
                            key={comp._id || idx}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                          >
                            <div>
                              <p className="font-bold text-slate-900">{comp.componentName}</p>
                              <p className="font-mono text-[11px] text-slate-500">
                                S/N: {comp.componentBarcode}
                              </p>
                            </div>
                            <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[10px] font-semibold border border-sky-200">
                              Attached
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
                  <Search className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No Chassis Scanned</p>
                  <p className="text-[11px] text-slate-400">
                    Scan or enter a product chassis barcode in Step 1 to verify tracking status and view component specifications.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Modal Dialog */}
        {isConfirmDialogOpen && productData && selectedPoint && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5">
              <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Package className="w-5 h-5 text-emerald-700" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Confirm Warehouse Intake
                  </h3>
                  <p className="text-xs text-slate-500">
                    Admit finished unit into inventory stock
                  </p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Chassis Barcode:</span>
                  <span className="font-mono font-bold text-slate-900">{productData.productBarcode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Product Model:</span>
                  <span className="font-bold text-slate-900">{productData.productModel || 'Refrigerator'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Components Bound:</span>
                  <span className="font-bold text-emerald-700">{productData.attachedComponents.length} Active</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                  <span className="text-slate-500">Destination Point:</span>
                  <span className="font-bold text-slate-900">{selectedPoint.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Receiving Operator:</span>
                  <span className="font-mono text-slate-700">{user?.userCode} ({user?.name})</span>
                </div>
                {stationNotes && (
                  <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                    <span className="text-slate-500">Notes:</span>
                    <span className="text-slate-800 italic">{stationNotes}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmDialogOpen(false)}
                  disabled={receiveLoading}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReceive}
                  disabled={receiveLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{receiveLoading ? 'Admitting...' : 'Confirm & Admit Into Stock'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Camera Barcode Scanner Modal */}
        <CameraBarcodeScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={(detectedBarcode) => {
            setIsScannerOpen(false);
            setProductBarcode(detectedBarcode);
            handleProductScanSubmit(undefined, detectedBarcode);
          }}
          title="Scan Product Chassis Barcode"
        />
      </div>
    </ProtectedRoute>
  );
}
