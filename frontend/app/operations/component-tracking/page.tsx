'use client';

import React, { useState, useEffect } from 'react';
import {
  Camera,
  RotateCcw,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  Zap,
  Undo2,
  Check,
} from 'lucide-react';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { CameraBarcodeScannerModal, playAudioBeep } from '@/src/components/scanner/CameraBarcodeScannerModal';
import { ToastNotification, ToastMessage } from '@/src/components/common/ToastNotification';
import { api, ApiClientError } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import { ApiResponse } from '@/src/types/api';
import { IComponentItem, IProductItem } from '@/src/types/admin';

interface AttachedComponentItem {
  _id: string;
  componentBarcode: string;
  productBarcode: string;
  componentName: string;
  attachedAt: string;
  attachedBy: string;
}

interface ProductScanResult {
  productBarcode: string;
  status: string;
  productModel?: string;
  productId?: string;
  canAttachComponents: boolean;
  blockReason?: string;
  attachedComponents: AttachedComponentItem[];
  historyCount: number;
}

/**
 * Standard industrial catalog fallback defaults.
 * Provides workstation resilience on the assembly floor if network access is degraded.
 */
const FALLBACK_PRODUCTS: IProductItem[] = [
  {
    _id: 'PROD_DEFAULT_1',
    productCode: 'REF-WDN-2B6',
    name: 'Refrigerator',
    modelNumber: 'WDN-2B6-RXXX',
    category: 'Appliances',
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    _id: 'PROD_DEFAULT_2',
    productCode: 'AC-INV-1.5T',
    name: 'Air Conditioner',
    modelNumber: 'WAC-18IN-INV',
    category: 'HVAC',
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    _id: 'PROD_DEFAULT_3',
    productCode: 'TV-4K-55',
    name: 'Smart Television',
    modelNumber: 'W-55-4K-AND',
    category: 'Electronics',
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
];

const FALLBACK_COMPONENTS: IComponentItem[] = [
  {
    _id: 'COMP_DEFAULT_1',
    componentCode: 'COMP-INV-01',
    name: 'Compressor',
    category: 'Mechanical',
    specifications: 'Rotary Inverter R600a',
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    _id: 'COMP_DEFAULT_2',
    componentCode: 'COND-CU-02',
    name: 'Condenser',
    category: 'Mechanical',
    specifications: 'Copper Tube Aluminum Fin',
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    _id: 'COMP_DEFAULT_3',
    componentCode: 'PCB-INV-03',
    name: 'Inverter PCB',
    category: 'Electrical',
    specifications: 'Main Inverter Control Driver',
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    _id: 'COMP_DEFAULT_4',
    componentCode: 'DISP-OLED-04',
    name: 'Display Panel',
    category: 'Electronics',
    specifications: 'Digital Temp Display & Control',
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
];

export default function ComponentTrackingPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Product Selection & Chassis State
  const [productBarcode, setProductBarcode] = useState('');
  const [productData, setProductData] = useState<ProductScanResult | null>(null);
  const [productModel, setProductModel] = useState<string>('Refrigerator');
  const [productId, setProductId] = useState<string>('');

  // Component Selection & Serialized Barcode State
  const [componentBarcode, setComponentBarcode] = useState('');
  const [componentName, setComponentName] = useState<string>('Compressor');
  const [componentId, setComponentId] = useState<string>('');

  // Master Catalogs for Selection Dropdowns
  const [masterProducts, setMasterProducts] = useState<IProductItem[]>(FALLBACK_PRODUCTS);
  const [masterComponents, setMasterComponents] = useState<IComponentItem[]>(FALLBACK_COMPONENTS);

  // UI / Scanner State
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [warningAlert, setWarningAlert] = useState<string | null>(null);
  const [scannerTarget, setScannerTarget] = useState<'product' | 'component' | null>(null);

  // Admin Reversal Modal State
  const [reversalTarget, setReversalTarget] = useState<AttachedComponentItem | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversalOpen, setIsReversalOpen] = useState(false);

  /**
   * Catalog Initialization:
   * Fetches active product models and component models via operational inventory endpoints:
   * - GET /api/v1/inventory/products
   * - GET /api/v1/inventory/components
   * These routes are accessible by COMPONENT_TRACKER and ADMIN roles without requiring
   * elevated MASTER_DATA_MANAGE permissions, ensuring dropdown items populate reliably.
   */
  useEffect(() => {
    let isMounted = true;
    const loadMasters = async () => {
      try {
        const [prodRes, compRes] = await Promise.all([
          api.get<ApiResponse<IProductItem[]>>('/inventory/products'),
          api.get<ApiResponse<IComponentItem[]>>('/inventory/components'),
        ]);

        if (isMounted) {
          const productsList =
            prodRes.success && prodRes.data && prodRes.data.length > 0
              ? prodRes.data
              : FALLBACK_PRODUCTS;
          const componentsList =
            compRes.success && compRes.data && compRes.data.length > 0
              ? compRes.data
              : FALLBACK_COMPONENTS;

          setMasterProducts(productsList);
          if (productsList.length > 0) {
            setProductId(productsList[0]._id);
            setProductModel(productsList[0].name);
          }

          setMasterComponents(componentsList);
          if (componentsList.length > 0) {
            setComponentId(componentsList[0]._id);
            setComponentName(componentsList[0].name);
          }
        }
      } catch {
        // Fallback gracefully to industrial standard catalogs if endpoint is unreachable
        if (isMounted) {
          setMasterProducts(FALLBACK_PRODUCTS);
          setProductId(FALLBACK_PRODUCTS[0]._id);
          setProductModel(FALLBACK_PRODUCTS[0].name);

          setMasterComponents(FALLBACK_COMPONENTS);
          setComponentId(FALLBACK_COMPONENTS[0]._id);
          setComponentName(FALLBACK_COMPONENTS[0].name);
        }
      }
    };

    loadMasters();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Verify / Scan Product Barcode
  const handleProductScanSubmit = async (e?: React.FormEvent, barcodeOverride?: string) => {
    if (e) e.preventDefault();
    const barcodeToScan = (barcodeOverride || productBarcode).trim().toUpperCase();

    if (!barcodeToScan) {
      setToast({ type: 'error', text: 'Please enter or scan a product chassis barcode' });
      return;
    }

    setLoading(true);
    setWarningAlert(null);
    try {
      const res = await api.get<ApiResponse<ProductScanResult>>(
        `/inventory/product-scan/${barcodeToScan}`
      );

      if (res.success && res.data) {
        setProductData(res.data);
        setProductBarcode(barcodeToScan);

        // Synchronize selected product model from scan history if recorded
        if (res.data.productModel) {
          setProductModel(res.data.productModel);
          const matched = masterProducts.find((p) => p.name === res.data?.productModel);
          if (matched) {
            setProductId(matched._id);
          }
        }
        if (res.data.productId) {
          setProductId(res.data.productId);
        }

        if (!res.data.canAttachComponents) {
          setWarningAlert(res.data.blockReason || 'Product is not in an attachable state.');
          playAudioBeep(330, 250);
        } else {
          playAudioBeep(880, 150);
          setToast({
            type: 'success',
            text: `Chassis verified: ${res.data.status} (${res.data.attachedComponents.length} components bound).`,
          });
        }
      }
    } catch (err: unknown) {
      playAudioBeep(220, 300);
      const msg = err instanceof ApiClientError ? err.message : 'Product verification failed';
      setToast({ type: 'error', text: msg });
      setProductData(null);
    } finally {
      setLoading(false);
    }
  };

  // 2. Attach Component
  const handleAttachComponent = async (e?: React.FormEvent, componentBarcodeOverride?: string) => {
    if (e) e.preventDefault();
    if (!productData) {
      setToast({ type: 'error', text: 'Please verify the product chassis barcode first' });
      return;
    }

    const cBarcode = (componentBarcodeOverride || componentBarcode).trim().toUpperCase();
    if (!cBarcode) {
      setToast({ type: 'error', text: 'Please scan or enter a component barcode' });
      return;
    }

    // Client-side quick duplicate check against current list
    const alreadyAttached = productData.attachedComponents.some(
      (c) => c.componentBarcode === cBarcode
    );
    if (alreadyAttached) {
      setWarningAlert(
        `DUPLICATE SCAN DETECTED: Component barcode '${cBarcode}' is already attached to this product chassis.`
      );
      playAudioBeep(250, 400);
      return;
    }

    setActionLoading(true);
    setWarningAlert(null);
    try {
      const res = await api.post<ApiResponse<ProductScanResult>>('/inventory/track-components', {
        productBarcode: productData.productBarcode,
        productId,
        productModel,
        componentBarcode: cBarcode,
        componentId,
        componentName,
      });

      if (res.success && res.data) {
        playAudioBeep(987, 180);
        setToast({
          type: 'success',
          text: `Success: Bound ${componentName} (${cBarcode}) to product ${productData.productBarcode}.`,
        });
        setComponentBarcode('');

        // Refresh product tracking status
        handleProductScanSubmit(undefined, productData.productBarcode);
      }
    } catch (err: unknown) {
      playAudioBeep(220, 400);
      const msg = err instanceof ApiClientError ? err.message : 'Component tracking failed';
      if (msg.toLowerCase().includes('already attached') || msg.toLowerCase().includes('conflict')) {
        setWarningAlert(`CONSTRAINED CONFLICT: ${msg}`);
      } else {
        setToast({ type: 'error', text: msg });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Admin Reversal Execution
  const handleOpenReversal = (comp: AttachedComponentItem) => {
    setReversalTarget(comp);
    setReversalReason('');
    setIsReversalOpen(true);
  };

  const handleExecuteReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget || !productData) return;

    if (reversalReason.trim().length < 10) {
      setToast({
        type: 'error',
        text: 'Reversal reason must be at least 10 characters long for audit compliance',
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post<ApiResponse<unknown>>('/inventory/reverse-component', {
        productBarcode: productData.productBarcode,
        componentBarcode: reversalTarget.componentBarcode,
        reason: reversalReason.trim(),
      });

      if (res.success) {
        setToast({
          type: 'success',
          text: `Component ${reversalTarget.componentBarcode} successfully detached and liberated for re-tracking.`,
        });
        setIsReversalOpen(false);
        setReversalTarget(null);
        handleProductScanSubmit(undefined, productData.productBarcode);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Component reversal failed';
      setToast({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  // Helper: Camera scan success handler
  const handleCameraScanSuccess = (decodedText: string) => {
    if (scannerTarget === 'product') {
      setProductBarcode(decodedText);
      handleProductScanSubmit(undefined, decodedText);
    } else if (scannerTarget === 'component') {
      setComponentBarcode(decodedText);
      handleAttachComponent(undefined, decodedText);
    }
    setScannerTarget(null);
  };

  // Reset Station
  const handleResetStation = () => {
    setProductBarcode('');
    setProductData(null);
    setComponentBarcode('');
    setWarningAlert(null);
    setToast(null);
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
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'COMPONENT_TRACKER']}>
      <div className="space-y-6">
        {/* Workstation Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Assembly Line Operations
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                Component Tracking
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Component Tracking Station
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Scan product chassis barcode and bind serialized modular components (1-to-N) prior to warehouse receiving.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900">{user?.name}</p>
              <p className="text-[11px] font-mono text-slate-500">ID: {user?.userCode}</p>
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
              <span>Operational Constraint Alert</span>
            </div>
            <p className="leading-relaxed pl-6">{warningAlert}</p>
          </div>
        )}

        {/* Main 2-Column Workstation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Product & Component Barcode Scanning Forms (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. PRODUCT CHASSIS SCANNING CARD */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-600 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Product Chassis Identification
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const testBarcode = `2440701AK${Math.floor(1000 + Math.random() * 9000)}`;
                    setProductBarcode(testBarcode);
                    handleProductScanSubmit(undefined, testBarcode);
                  }}
                  className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  <span>Sample Chassis ID</span>
                </button>
              </div>

              <form onSubmit={handleProductScanSubmit} className="space-y-3">
                {/* Product Model Selection Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Product Model / Category
                  </label>
                  <select
                    value={productId}
                    disabled={!!productData && productData.status !== 'NEW_UNTRACKED'}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setProductId(selId);
                      const matched = masterProducts.find((p) => p._id === selId);
                      if (matched) {
                        setProductModel(matched.name);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    {masterProducts.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} {p.productCode ? `(${p.productCode})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

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
                      className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 uppercase font-mono font-bold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setScannerTarget('product')}
                      className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shrink-0"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Camera</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {loading ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Product Information Panel */}
              {productData && (
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Active Chassis Profile
                      </span>
                      <p className="text-sm font-black font-mono text-slate-900 mt-0.5">
                        {productData.productBarcode}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(
                        productData.status
                      )}`}
                    >
                      Status: {productData.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold">Product Model</span>
                      <p className="font-bold text-slate-800">{productData.productModel || productModel}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold">Attached Units</span>
                      <p className="font-bold text-sky-700">
                        {productData.attachedComponents.length} component(s)
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold">Can Track</span>
                      <p
                        className={`font-bold flex items-center gap-1 ${
                          productData.canAttachComponents ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {productData.canAttachComponents ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Eligible</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Blocked</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. COMPONENT SUB-ASSEMBLY SCANNING CARD */}
            <div
              className={`bg-white rounded-2xl border p-6 shadow-xs space-y-4 transition-opacity ${
                productData && productData.canAttachComponents
                  ? 'border-slate-200 opacity-100'
                  : 'border-slate-200/60 opacity-60 pointer-events-none'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Component Sub-Assembly Binding
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const testComp = `COMP_${Math.floor(100000 + Math.random() * 900000)}`;
                    setComponentBarcode(testComp);
                  }}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  <span>Sample Barcode</span>
                </button>
              </div>

              <form onSubmit={handleAttachComponent} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Component Model Selection Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Component Model / Type
                    </label>
                    <select
                      value={componentId}
                      onChange={(e) => {
                        const selId = e.target.value;
                        setComponentId(selId);
                        const matched = masterComponents.find((c) => c._id === selId);
                        if (matched) {
                          setComponentName(matched.name);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
                    >
                      {masterComponents.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} {c.componentCode ? `(${c.componentCode})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Component Serialized Barcode
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="e.g. 94A600321852"
                        value={componentBarcode}
                        onChange={(e) => setComponentBarcode(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setScannerTarget('component')}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                        title="Scan with Camera"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={actionLoading || !productData?.canAttachComponents}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    <span>{actionLoading ? 'Binding...' : 'Bind Component to Product'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Attached Components List & Ledger History (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Bound Components (Chassis BOM)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {productData
                      ? `${productData.attachedComponents.length} sub-assemblies actively registered`
                      : 'Scan a product chassis to inspect BOM'}
                  </p>
                </div>
                {productData && (
                  <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200">
                    {productData.attachedComponents.length} / 1:N
                  </span>
                )}
              </div>

              <div className="p-4 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[500px]">
                {!productData || productData.attachedComponents.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Cpu className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs">No components currently attached to this chassis.</p>
                    <p className="text-[11px] text-slate-400">
                      Use the scanner on the left to bind serialized parts.
                    </p>
                  </div>
                ) : (
                  productData.attachedComponents.map((comp) => (
                    <div
                      key={comp._id || comp.componentBarcode}
                      className="py-3 flex items-start justify-between gap-3 group"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-slate-900">
                            {comp.componentName}
                          </span>
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded-full border border-emerald-200">
                            BOUND
                          </span>
                        </div>
                        <p className="text-[11px] font-mono font-bold text-slate-600">
                          {comp.componentBarcode}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Attached: {new Date(comp.attachedAt).toLocaleTimeString()}
                        </p>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => handleOpenReversal(comp)}
                          title="Reverse and detach this component"
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <Undo2 className="w-3 h-3" />
                          <span>Reverse</span>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                <span>1:1 Component Exclusivity: Enforced</span>
                <span>Ledger Immutability: Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- CAMERA SCANNER MODAL ---------------- */}
      <CameraBarcodeScannerModal
        isOpen={scannerTarget !== null}
        title={scannerTarget === 'product' ? 'Scan Product Chassis Barcode' : 'Scan Component Sub-Assembly Barcode'}
        onScanSuccess={handleCameraScanSuccess}
        onClose={() => setScannerTarget(null)}
      />

      {/* ---------------- ADMIN REVERSAL MODAL ---------------- */}
      {isReversalOpen && reversalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Reverse Component Attachment
                </h3>
                <p className="text-xs text-slate-400">
                  Component will be detached and liberated for re-tracking.
                </p>
              </div>
              <button
                onClick={() => setIsReversalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteReversal} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <span className="font-bold">Target Component:</span>
                <p className="font-mono text-xs font-bold">
                  {reversalTarget.componentName} • {reversalTarget.componentBarcode}
                </p>
                <p className="text-[11px] text-amber-800">
                  Product Chassis: <span className="font-mono">{productData?.productBarcode}</span>
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mandatory Reversal Audit Reason (Min 10 characters)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Defective compressor swapped on assembly line prior to QC inspection..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 text-slate-900 text-xs"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Reason length: {reversalReason.trim().length} / 10 min chars
                </span>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReversalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || reversalReason.trim().length < 10}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Reversing...' : 'Execute Reversal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
