'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { CameraBarcodeScannerModal, playAudioBeep } from '@/src/components/scanner/CameraBarcodeScannerModal';
import { ToastNotification, ToastMessage } from '@/src/components/common/ToastNotification';
import { api, ApiClientError } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import { ApiResponse } from '@/src/types/api';
import { IDeliveryPointItem } from '@/src/types/admin';

interface AttachedComponentItem {
  _id?: string;
  componentBarcode: string;
  componentName: string;
  attachedAt: string;
  attachedBy?: string;
}

interface CurrentReceivePointInfo {
  pointId?: string;
  pointName: string;
  pointCode?: string;
  location?: string;
  receivedAt: string;
  receivedBy: string;
  userCode: string;
  transactionId?: string;
}

interface LastDeliveryInfo {
  pointId?: string;
  pointName: string;
  pointCode?: string;
  location?: string;
  deliveredAt: string;
  deliveredBy: string;
  userCode: string;
  originalReceivePointName?: string;
  transactionId?: string;
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
  currentReceivePoint?: CurrentReceivePointInfo;
  lastDelivery?: LastDeliveryInfo;
  attachedComponents: AttachedComponentItem[];
  historyCount: number;
}

interface DeliveryResult {
  message: string;
  status: string;
  productBarcode: string;
  productModel: string;
  deliveryPoint: {
    id: string;
    pointCode: string;
    name: string;
    location?: string;
  };
  originalReceivePoint: {
    id?: string;
    name: string;
    code?: string;
    location?: string;
    receivedAt?: string;
    receivedBy?: string;
    userCode?: string;
  };
  transaction: {
    _id: string;
    eventType: string;
    pointName: string;
    userCode: string;
    userName: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
  };
  attachedComponentsCount: number;
  attachedComponents: AttachedComponentItem[];
}

export default function ProductDeliveryPage() {
  const { user } = useAuth();

  // Scanning State
  const [productBarcode, setProductBarcode] = useState('');
  const [productData, setProductData] = useState<ProductScanResult | null>(null);

  // Delivery Point Selection
  const [deliveryPoints, setDeliveryPoints] = useState<IDeliveryPointItem[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string>('');
  const [stationNotes, setStationNotes] = useState('');

  // UI / Action State
  const [loading, setLoading] = useState(false);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [warningAlert, setWarningAlert] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [deliverySuccessReceipt, setDeliverySuccessReceipt] = useState<DeliveryResult | null>(null);

  // Load active delivery points on mount
  useEffect(() => {
    let isMounted = true;
    const fetchDeliveryPoints = async () => {
      try {
        const res = await api.get<ApiResponse<IDeliveryPointItem[]>>('/inventory/delivery-points');
        if (isMounted && res.success && res.data && res.data.length > 0) {
          setDeliveryPoints(res.data);
          setSelectedPointId(res.data[0]._id);
        }
      } catch {
        // Fallback default points if network delays
        if (isMounted) {
          const fallbackPoints: IDeliveryPointItem[] = [
            {
              _id: 'DP_FALLBACK_1',
              pointCode: 'DP-REF-01',
              name: 'Refrigerator Delivery Point 1',
              location: 'Outbound Bay 1 - North Logistics Gate',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              _id: 'DP_FALLBACK_2',
              pointCode: 'DP-REF-02',
              name: 'Refrigerator Delivery Point 2',
              location: 'Outbound Bay 2 - South Distribution Dock',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];
          setDeliveryPoints(fallbackPoints);
          setSelectedPointId(fallbackPoints[0]._id);
        }
      }
    };

    fetchDeliveryPoints();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Verify / Scan Product Chassis Barcode
  const handleProductScanSubmit = async (e?: React.FormEvent, barcodeOverride?: string) => {
    if (e) e.preventDefault();
    const barcodeToScan = (barcodeOverride || productBarcode).trim().toUpperCase();

    if (!barcodeToScan) {
      setToast({ type: 'error', text: 'Please enter or scan a product chassis barcode' });
      return;
    }

    setLoading(true);
    setWarningAlert(null);
    setDeliverySuccessReceipt(null);

    try {
      const res = await api.get<ApiResponse<ProductScanResult>>(
        `/inventory/product-scan/${barcodeToScan}`
      );

      if (res.success && res.data) {
        setProductData(res.data);
        setProductBarcode(barcodeToScan);

        if (!res.data.hasActiveComponents || res.data.status === 'NEW_UNTRACKED') {
          setWarningAlert(
            '⚠️ Product Unavailable: Chassis has not undergone component tracking and was never admitted into warehouse stock.'
          );
          playAudioBeep(330, 250); // Warning buzzer
        } else if (res.data.status === 'TRACKED' && !res.data.isCurrentlyReceived) {
          setWarningAlert(
            '⚠️ Product Unavailable: Unit has completed component tracking but was never received into warehouse inventory. Intake must precede delivery.'
          );
          playAudioBeep(330, 250);
        } else if (res.data.status === 'DELIVERED' || res.data.isCurrentlyDelivered) {
          setWarningAlert(
            '⚠️ Duplicate Delivery Blocked: Product has already been dispatched/delivered from warehouse stock. Duplicate delivery is strictly prohibited.'
          );
          playAudioBeep(330, 250);
        } else if (res.data.status === 'IN_STOCK' && res.data.isCurrentlyReceived) {
          playAudioBeep(880, 150); // Success chime
          setToast({
            type: 'success',
            text: `Chassis verified: Available in stock at '${res.data.currentReceivePoint?.pointName || 'Warehouse'}'. Ready for dispatch.`,
          });
        }
      }
    } catch (err: unknown) {
      playAudioBeep(220, 300);
      const msg = err instanceof ApiClientError ? err.message : 'Product chassis verification failed';
      setToast({ type: 'error', text: msg });
      setProductData(null);
    } finally {
      setLoading(false);
    }
  };

  // 2. Open Confirmation Dialog
  const handleOpenConfirmation = () => {
    if (!productData) {
      setToast({ type: 'error', text: 'Please scan and verify a product chassis barcode first' });
      return;
    }
    if (productData.isCurrentlyDelivered) {
      setToast({
        type: 'error',
        text: 'Cannot deliver product: Unit has already been delivered.',
      });
      return;
    }
    if (productData.status !== 'IN_STOCK' || !productData.isCurrentlyReceived) {
      setToast({
        type: 'error',
        text: 'Cannot deliver product: Unit is not currently available in warehouse stock.',
      });
      return;
    }
    if (!selectedPointId) {
      setToast({ type: 'error', text: 'Please select an active destination delivery point' });
      return;
    }

    setIsConfirmDialogOpen(true);
  };

  // 3. Confirm & Execute Delivery
  const handleConfirmDelivery = async () => {
    if (!productData || !selectedPointId) return;

    setDeliveryLoading(true);
    try {
      const selectedPoint = deliveryPoints.find((p) => p._id === selectedPointId);
      const res = await api.post<ApiResponse<DeliveryResult>>('/inventory/deliver', {
        productBarcode: productData.productBarcode,
        deliveryPointId: selectedPointId,
        deliveryPointCode: selectedPoint?.pointCode,
        stationNotes: stationNotes.trim() || undefined,
      });

      if (res.success && res.data) {
        const deliveryData = res.data;
        playAudioBeep(880, 250); // Double success chime
        setTimeout(() => playAudioBeep(1174, 200), 120);

        setDeliverySuccessReceipt(deliveryData);
        setIsConfirmDialogOpen(false);
        setWarningAlert(null);

        // Update product data to reflect DELIVERED
        setProductData((prev) =>
          prev
            ? {
                ...prev,
                status: 'DELIVERED',
                isCurrentlyDelivered: true,
                canAttachComponents: false,
                lastDelivery: {
                  pointName: deliveryData.deliveryPoint.name,
                  pointCode: deliveryData.deliveryPoint.pointCode,
                  deliveredAt: new Date().toISOString(),
                  deliveredBy: user?.name || 'Operator',
                  userCode: user?.userCode || '',
                  originalReceivePointName: deliveryData.originalReceivePoint.name,
                },
              }
            : null
        );

        setToast({
          type: 'success',
          text: `Delivery Complete: Product '${res.data.productBarcode}' issued from '${res.data.originalReceivePoint.name}' via '${res.data.deliveryPoint.name}'.`,
        });
      }
    } catch (err: unknown) {
      playAudioBeep(220, 350);
      const msg = err instanceof ApiClientError ? err.message : 'Product delivery failed';
      setToast({ type: 'error', text: msg });
    } finally {
      setDeliveryLoading(false);
    }
  };

  // 4. Reset Station
  const handleResetStation = () => {
    setProductBarcode('');
    setProductData(null);
    setWarningAlert(null);
    setDeliverySuccessReceipt(null);
    setStationNotes('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'DELIVERED':
        return 'bg-purple-50 text-purple-800 border-purple-300';
      case 'TRACKED':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'NEW_UNTRACKED':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const selectedPoint = deliveryPoints.find((p) => p._id === selectedPointId);
  const canDeliver =
    productData &&
    productData.status === 'IN_STOCK' &&
    productData.isCurrentlyReceived &&
    !productData.isCurrentlyDelivered;

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'DELIVERY_USER']}>
      <div className="space-y-6">
        {/* Workstation Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Outbound Logistics Operations
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Day 7 of 10
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Product Delivery Dock (Outbound Dispatch)
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verify real-time stock availability, inspect origin intake bay history, and dispatch finished refrigerator units through authorized delivery points.
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
              className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              🔄 Clear Station
            </button>
          </div>
        </div>

        {/* Notifications & Warning Alerts */}
        <ToastNotification toast={toast} onClose={() => setToast(null)} />

        {warningAlert && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs shadow-xs space-y-1 animate-in fade-in">
            <div className="flex items-center space-x-2 font-bold">
              <span>⚠️ Delivery Invariant Constraint Alert</span>
            </div>
            <p className="leading-relaxed">{warningAlert}</p>
          </div>
        )}

        {/* Success Receipt Banner (When Unit Delivered) */}
        {deliverySuccessReceipt && (
          <div className="p-6 rounded-2xl bg-purple-50 border border-purple-300 text-purple-950 shadow-sm animate-in fade-in space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-purple-200 pb-3">
              <div className="flex items-center space-x-3">
                <span className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xl font-bold">
                  🚚
                </span>
                <div>
                  <h3 className="text-base font-black text-purple-900">
                    Product Successfully Dispatched from Warehouse
                  </h3>
                  <p className="text-xs text-purple-700">
                    Immutable ledger transaction #{deliverySuccessReceipt.transaction._id} recorded
                  </p>
                </div>
              </div>
              <button
                onClick={handleResetStation}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Scan Next Unit ➔
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-white/80 p-3 rounded-xl border border-purple-200">
                <span className="text-[10px] uppercase font-bold text-purple-600 block">Product Barcode</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {deliverySuccessReceipt.productBarcode}
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-purple-200">
                <span className="text-[10px] uppercase font-bold text-purple-600 block">Origin Bay (Intake)</span>
                <span className="font-bold text-slate-900 text-sm">
                  {deliverySuccessReceipt.originalReceivePoint.name}
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-purple-200">
                <span className="text-[10px] uppercase font-bold text-purple-600 block">Outbound Dock</span>
                <span className="font-bold text-slate-900 text-sm">
                  {deliverySuccessReceipt.deliveryPoint.name}
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-purple-200">
                <span className="text-[10px] uppercase font-bold text-purple-600 block">Lifecycle State</span>
                <span className="inline-block px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 text-xs">
                  DELIVERED
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main Workstation 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Barcode Scanning & Delivery Point Selection (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: SCAN PRODUCT CHASSIS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
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
                  className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
                >
                  ⚡ Sample Walton Chassis (2440701AK2057)
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
                      className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 uppercase font-mono font-bold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer shrink-0"
                    >
                      <span>📷 Camera</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !productBarcode.trim()}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs"
                    >
                      {loading ? 'Checking Stock...' : 'Check Stock ➔'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Accepts laser barcode scan, camera scanner, or keyboard input.
                  </p>
                </div>
              </form>
            </div>

            {/* Current Receive Point Display (Origin Stock Bay) */}
            {productData && productData.currentReceivePoint && (
              <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200/70 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-md bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                      📍
                    </span>
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                      Origin Stock Location (Current Bay)
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    IN STOCK
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-emerald-700 font-medium block">Admitted Point:</span>
                    <span className="font-bold text-emerald-950">
                      {productData.currentReceivePoint.pointName}
                    </span>
                    {productData.currentReceivePoint.pointCode && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded bg-emerald-200/60 text-emerald-800 text-[10px] font-mono">
                        {productData.currentReceivePoint.pointCode}
                      </span>
                    )}
                  </div>
                  {productData.currentReceivePoint.location && (
                    <div>
                      <span className="text-[11px] text-emerald-700 font-medium block">Physical Bay:</span>
                      <span className="text-emerald-900">
                        {productData.currentReceivePoint.location}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-[11px] text-emerald-700 font-medium block">Intake Date & Time:</span>
                    <span className="text-emerald-900 font-mono">
                      {new Date(productData.currentReceivePoint.receivedAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-emerald-700 font-medium block">Intake Operator:</span>
                    <span className="text-emerald-900 font-semibold">
                      {productData.currentReceivePoint.receivedBy} ({productData.currentReceivePoint.userCode})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: DESTINATION DELIVERY POINT SELECTOR */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <span className="w-6 h-6 rounded-lg bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Outbound Delivery Point (Dock)
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Outbound Dock / Logistics Gate
                  </label>
                  <select
                    value={selectedPointId}
                    onChange={(e) => setSelectedPointId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 font-semibold text-slate-900 cursor-pointer"
                  >
                    {deliveryPoints.map((pt) => (
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
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                        {selectedPoint.pointCode}
                      </span>
                    </div>
                    {selectedPoint.location && (
                      <p className="text-slate-500 text-[11px]">
                        📍 Location: {selectedPoint.location}
                      </p>
                    )}
                  </div>
                )}

                {/* Station Shift / Invoice / Logistics Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dispatch / Invoice Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Truck #DHK-4829, Order #INV-9901, Dispatch Gate 2"
                    value={stationNotes}
                    onChange={(e) => setStationNotes(e.target.value)}
                    maxLength={200}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: DISPATCH ACTION BUTTON */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                {canDeliver ? (
                  <span className="text-purple-700 font-bold flex items-center space-x-1.5">
                    <span>✓</span>
                    <span>Stock verified. Ready to dispatch unit from warehouse.</span>
                  </span>
                ) : (
                  <span className="text-slate-400">
                    Scan and verify an available in-stock chassis above to enable delivery.
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleOpenConfirmation}
                disabled={!canDeliver || deliveryLoading}
                className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer shrink-0"
              >
                {deliveryLoading ? 'Dispatching...' : '🚚 Dispatch Product Out of Stock ➔'}
              </button>
            </div>
          </div>

          {/* Right Column: Live Product Validation & Bill of Materials (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Product Status & Stock Details
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

                  {/* Stock Availability Evaluation Box */}
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      productData.status === 'IN_STOCK'
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                        : productData.status === 'DELIVERED'
                        ? 'bg-purple-50 border-purple-200 text-purple-950'
                        : 'bg-rose-50 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">
                        {productData.status === 'IN_STOCK'
                          ? '✓ Available in Stock'
                          : productData.status === 'DELIVERED'
                          ? '✕ Already Delivered / Dispatched'
                          : '✕ Not Available in Stock'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          productData.status === 'IN_STOCK'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {productData.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {productData.status === 'IN_STOCK'
                        ? 'Unit is verified available in warehouse stock. Ready for outbound delivery.'
                        : productData.status === 'DELIVERED'
                        ? 'This unit has already exited the warehouse. Duplicate delivery is strictly prevented.'
                        : 'Unit has either not been received or its intake was reversed. It cannot be delivered at this stage.'}
                    </p>
                  </div>

                  {/* Attached Sub-Assemblies Table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 mb-2">
                      Verified Sub-Assemblies ({productData.attachedComponents.length}):
                    </h4>
                    {productData.attachedComponents.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No sub-assembly components attached.
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
                  <span className="text-3xl block">🚚</span>
                  <p className="text-xs font-bold text-slate-700">No Chassis Scanned</p>
                  <p className="text-[11px] text-slate-400">
                    Scan or enter a product chassis barcode in Step 1 to verify stock availability and view intake origin history.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Modal Dialog */}
        {isConfirmDialogOpen && productData && selectedPoint && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in zoom-in-95">
              <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
                <span className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-lg font-bold">
                  🚚
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Confirm Product Delivery
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dispatch finished goods out of warehouse stock
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
                {productData.currentReceivePoint && (
                  <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                    <span className="text-slate-500">Origin Intake Bay:</span>
                    <span className="font-bold text-emerald-800">{productData.currentReceivePoint.pointName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Destination Dock:</span>
                  <span className="font-bold text-purple-900">{selectedPoint.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Dispatch Operator:</span>
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
                  disabled={deliveryLoading}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelivery}
                  disabled={deliveryLoading}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {deliveryLoading ? 'Dispatching...' : '✓ Confirm & Dispatch Out of Stock'}
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
