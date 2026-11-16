'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { AdminSidebar } from '@/src/components/admin/AdminSidebar';
import { AdminStatsCards } from '@/src/components/admin/AdminStatsCards';
import { ConfirmationModal } from '@/src/components/common/ConfirmationModal';
import { ToastNotification, ToastMessage } from '@/src/components/common/ToastNotification';
import { api, ApiClientError } from '@/src/lib/api';
import {
  IProductItem,
  IComponentItem,
  IReceivePointItem,
  IDeliveryPointItem,
  IPaginationMeta,
} from '@/src/types/admin';
import { ApiResponse } from '@/src/types/api';

type MasterTab = 'products' | 'components' | 'receive-points' | 'delivery-points';

interface MasterListResponse<T> {
  data: T[];
  meta?: IPaginationMeta;
}

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<MasterTab>('products');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Common Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [pagination, setPagination] = useState<IPaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  // Data sets
  const [products, setProducts] = useState<IProductItem[]>([]);
  const [components, setComponents] = useState<IComponentItem[]>([]);
  const [receivePoints, setReceivePoints] = useState<IReceivePointItem[]>([]);
  const [deliveryPoints, setDeliveryPoints] = useState<IDeliveryPointItem[]>([]);

  // Modals & Action States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<{
    id: string;
    code: string;
    name: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form States
  const [productForm, setProductForm] = useState({
    productCode: '',
    barcode: '',
    name: '',
    modelNumber: '',
    category: 'Appliances',
    description: '',
    isActive: true,
  });

  const [componentForm, setComponentForm] = useState({
    componentCode: '',
    barcode: '',
    name: '',
    category: 'Mechanical',
    specifications: '',
    isActive: true,
  });

  const [pointForm, setPointForm] = useState({
    pointCode: '',
    name: '',
    location: '',
    isActive: true,
  });

  // Fetch data dynamically based on active tab
  const fetchData = useCallback(
    async (page = 1, showSpinner = true) => {
      if (showSpinner) setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '10',
        });
        if (search.trim()) params.append('search', search.trim());
        if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
        if (statusFilter !== 'ALL') params.append('isActive', statusFilter);

        const endpoint = `/master/${activeTab}?${params.toString()}`;

        if (activeTab === 'products') {
          const res = await api.get<ApiResponse<IProductItem[]> & MasterListResponse<IProductItem>>(
            endpoint
          );
          if (res.success && res.data) {
            setProducts(res.data);
            if (res.meta) {
              setPagination(res.meta);
              if (res.meta.categories) setCategoriesList(res.meta.categories);
            }
          }
        } else if (activeTab === 'components') {
          const res = await api.get<
            ApiResponse<IComponentItem[]> & MasterListResponse<IComponentItem>
          >(endpoint);
          if (res.success && res.data) {
            setComponents(res.data);
            if (res.meta) {
              setPagination(res.meta);
              if (res.meta.categories) setCategoriesList(res.meta.categories);
            }
          }
        } else if (activeTab === 'receive-points') {
          const res = await api.get<
            ApiResponse<IReceivePointItem[]> & MasterListResponse<IReceivePointItem>
          >(endpoint);
          if (res.success && res.data) {
            setReceivePoints(res.data);
            if (res.meta) setPagination(res.meta);
          }
        } else {
          const res = await api.get<
            ApiResponse<IDeliveryPointItem[]> & MasterListResponse<IDeliveryPointItem>
          >(endpoint);
          if (res.success && res.data) {
            setDeliveryPoints(res.data);
            if (res.meta) setPagination(res.meta);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof ApiClientError ? err.message : 'Failed to fetch catalog records';
        setToast({ type: 'error', text: msg });
      } finally {
        setLoading(false);
      }
    },
    [activeTab, search, categoryFilter, statusFilter]
  );

  useEffect(() => {
    let isMounted = true;
    const initialLoad = async () => {
      try {
        const params = new URLSearchParams({ page: '1', limit: '10' });
        if (search.trim()) params.append('search', search.trim());
        if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
        if (statusFilter !== 'ALL') params.append('isActive', statusFilter);

        const endpoint = `/master/${activeTab}?${params.toString()}`;

        if (activeTab === 'products') {
          const res = await api.get<ApiResponse<IProductItem[]> & MasterListResponse<IProductItem>>(
            endpoint
          );
          if (isMounted && res.success && res.data) {
            setProducts(res.data);
            if (res.meta) {
              setPagination(res.meta);
              if (res.meta.categories) setCategoriesList(res.meta.categories);
            }
            setLoading(false);
          }
        } else if (activeTab === 'components') {
          const res = await api.get<
            ApiResponse<IComponentItem[]> & MasterListResponse<IComponentItem>
          >(endpoint);
          if (isMounted && res.success && res.data) {
            setComponents(res.data);
            if (res.meta) {
              setPagination(res.meta);
              if (res.meta.categories) setCategoriesList(res.meta.categories);
            }
            setLoading(false);
          }
        } else if (activeTab === 'receive-points') {
          const res = await api.get<
            ApiResponse<IReceivePointItem[]> & MasterListResponse<IReceivePointItem>
          >(endpoint);
          if (isMounted && res.success && res.data) {
            setReceivePoints(res.data);
            if (res.meta) setPagination(res.meta);
            setLoading(false);
          }
        } else {
          const res = await api.get<
            ApiResponse<IDeliveryPointItem[]> & MasterListResponse<IDeliveryPointItem>
          >(endpoint);
          if (isMounted && res.success && res.data) {
            setDeliveryPoints(res.data);
            if (res.meta) setPagination(res.meta);
            setLoading(false);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            err instanceof ApiClientError ? err.message : 'Failed to fetch catalog records';
          setToast({ type: 'error', text: msg });
          setLoading(false);
        }
      }
    };

    initialLoad();
    return () => {
      isMounted = false;
    };
  }, [activeTab, search, categoryFilter, statusFilter]);

  // Tab switch handler
  const handleTabSwitch = (tab: MasterTab) => {
    setActiveTab(tab);
    setSearch('');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setCategoriesList([]);
  };

  // Search handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(1, true);
  };

  // Create handlers
  const handleOpenCreate = () => {
    setProductForm({
      productCode: '',
      barcode: '',
      name: '',
      modelNumber: '',
      category: 'Appliances',
      description: '',
      isActive: true,
    });
    setComponentForm({
      componentCode: '',
      barcode: '',
      name: '',
      category: 'Mechanical',
      specifications: '',
      isActive: true,
    });
    setPointForm({
      pointCode: '',
      name: '',
      location: '',
      isActive: true,
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (activeTab === 'products') {
        const res = await api.post<ApiResponse<IProductItem>>('/master/products', productForm);
        if (res.success) {
          setToast({ type: 'success', text: 'Product created successfully.' });
          setIsCreateModalOpen(false);
          fetchData(1, true);
        }
      } else if (activeTab === 'components') {
        const res = await api.post<ApiResponse<IComponentItem>>('/master/components', componentForm);
        if (res.success) {
          setToast({ type: 'success', text: 'Component created successfully.' });
          setIsCreateModalOpen(false);
          fetchData(1, true);
        }
      } else {
        const res = await api.post<ApiResponse<IReceivePointItem | IDeliveryPointItem>>(
          `/master/${activeTab}`,
          pointForm
        );
        if (res.success) {
          setToast({ type: 'success', text: 'Location point created successfully.' });
          setIsCreateModalOpen(false);
          fetchData(1, true);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to create record';
      setToast({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  // Edit handlers
  const handleOpenEditProduct = (item: IProductItem) => {
    setSelectedProductId(item._id);
    setProductForm({
      productCode: item.productCode,
      barcode: item.barcode || '',
      name: item.name,
      modelNumber: item.modelNumber || '',
      category: item.category,
      description: item.description || '',
      isActive: item.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditComponent = (item: IComponentItem) => {
    setSelectedComponentId(item._id);
    setComponentForm({
      componentCode: item.componentCode,
      barcode: item.barcode || '',
      name: item.name,
      category: item.category,
      specifications: item.specifications || '',
      isActive: item.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditPoint = (item: IReceivePointItem | IDeliveryPointItem) => {
    setSelectedPointId(item._id);
    setPointForm({
      pointCode: item.pointCode,
      name: item.name,
      location: item.location || '',
      isActive: item.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (activeTab === 'products' && selectedProductId) {
        const res = await api.put<ApiResponse<IProductItem>>(
          `/master/products/${selectedProductId}`,
          productForm
        );
        if (res.success) {
          setToast({ type: 'success', text: 'Product updated successfully.' });
          setIsEditModalOpen(false);
          fetchData(pagination.page, false);
        }
      } else if (activeTab === 'components' && selectedComponentId) {
        const res = await api.put<ApiResponse<IComponentItem>>(
          `/master/components/${selectedComponentId}`,
          componentForm
        );
        if (res.success) {
          setToast({ type: 'success', text: 'Component updated successfully.' });
          setIsEditModalOpen(false);
          fetchData(pagination.page, false);
        }
      } else if (selectedPointId) {
        const res = await api.put<ApiResponse<IReceivePointItem | IDeliveryPointItem>>(
          `/master/${activeTab}/${selectedPointId}`,
          pointForm
        );
        if (res.success) {
          setToast({ type: 'success', text: 'Location point updated successfully.' });
          setIsEditModalOpen(false);
          fetchData(pagination.page, false);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to update record';
      setToast({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  // Soft Deactivate / Delete handlers
  const handleConfirmDelete = async () => {
    if (!confirmDeleteItem) return;
    setActionLoading(true);
    try {
      const res = await api.delete<ApiResponse<unknown>>(
        `/master/${activeTab}/${confirmDeleteItem.id}`
      );
      if (res.success) {
        setToast({
          type: 'success',
          text: res.message || 'Record soft-deactivated successfully to protect history.',
        });
        setConfirmDeleteItem(null);
        fetchData(pagination.page, false);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to delete record';
      setToast({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="space-y-6">
        <AdminStatsCards />

        <ToastNotification toast={toast} onClose={() => setToast(null)} />

        <div className="flex flex-col lg:flex-row gap-6">
          <AdminSidebar />

          <main className="flex-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Master Catalogs
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    Day 4 of 10
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                  Manufacturing Master Data Management
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Define products, sub-assembly components, warehouse intake bays, and outbound shipping docks.
                </p>
              </div>

              <button
                onClick={handleOpenCreate}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <span>
                  ➕ Add New{' '}
                  {activeTab === 'products'
                    ? 'Product'
                    : activeTab === 'components'
                    ? 'Component'
                    : 'Point'}
                </span>
              </button>
            </div>

            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
              <button
                onClick={() => handleTabSwitch('products')}
                className={`px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'products'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>📦</span>
                <span>Products Catalog</span>
              </button>

              <button
                onClick={() => handleTabSwitch('components')}
                className={`px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'components'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>🧩</span>
                <span>Components Catalog</span>
              </button>

              <button
                onClick={() => handleTabSwitch('receive-points')}
                className={`px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'receive-points'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>📥</span>
                <span>Receive Bays</span>
              </button>

              <button
                onClick={() => handleTabSwitch('delivery-points')}
                className={`px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'delivery-points'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>📤</span>
                <span>Delivery Docks</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
              <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center space-x-2">
                <input
                  type="text"
                  placeholder={`Search ${activeTab} by code, barcode, or name...`}
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
                {(activeTab === 'products' || activeTab === 'components') &&
                  categoriesList.length > 0 && (
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden cursor-pointer"
                    >
                      <option value="ALL">All Categories</option>
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">All Status</option>
                  <option value="true">Active Only</option>
                  <option value="false">Deactivated Only</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Identifier / Code</th>
                      <th className="py-3 px-4">Master Barcode</th>
                      <th className="py-3 px-4">Name / Description</th>
                      <th className="py-3 px-4">Category / Location</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          Loading master records...
                        </td>
                      </tr>
                    ) : (
                      <>
                        {activeTab === 'products' &&
                          (products.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400">
                                No products found.
                              </td>
                            </tr>
                          ) : (
                            products.map((p) => (
                              <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                  {p.productCode}
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                                  {p.barcode || <span className="text-slate-400 italic">None</span>}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900">{p.name}</div>
                                  <div className="text-[11px] text-slate-400">
                                    {p.modelNumber ? `Model: ${p.modelNumber} • ` : ''}
                                    {p.description || ''}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                                    {p.category}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      p.isActive
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}
                                  >
                                    <span>{p.isActive ? 'Active' : 'Inactive'}</span>
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right space-x-1.5">
                                  <button
                                    onClick={() => handleOpenEditProduct(p)}
                                    className="px-2 py-1 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      setConfirmDeleteItem({
                                        id: p._id,
                                        code: p.productCode,
                                        name: p.name,
                                      })
                                    }
                                    className="px-2 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg border border-rose-200 text-[11px] font-medium transition-colors cursor-pointer"
                                  >
                                    🗑️ Soft-Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          ))}

                        {activeTab === 'components' &&
                          (components.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400">
                                No components found.
                              </td>
                            </tr>
                          ) : (
                            components.map((c) => (
                              <tr key={c._id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                  {c.componentCode}
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                                  {c.barcode || <span className="text-slate-400 italic">None</span>}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900">{c.name}</div>
                                  <div className="text-[11px] text-slate-400">
                                    {c.specifications || ''}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                                    {c.category}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      c.isActive
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}
                                  >
                                    <span>{c.isActive ? 'Active' : 'Inactive'}</span>
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right space-x-1.5">
                                  <button
                                    onClick={() => handleOpenEditComponent(c)}
                                    className="px-2 py-1 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      setConfirmDeleteItem({
                                        id: c._id,
                                        code: c.componentCode,
                                        name: c.name,
                                      })
                                    }
                                    className="px-2 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg border border-rose-200 text-[11px] font-medium transition-colors cursor-pointer"
                                  >
                                    🗑️ Soft-Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          ))}

                        {activeTab === 'receive-points' &&
                          (receivePoints.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400">
                                No receive points found.
                              </td>
                            </tr>
                          ) : (
                            receivePoints.map((rp) => (
                              <tr key={rp._id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                  {rp.pointCode}
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                                  Auto-assigned
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900">{rp.name}</div>
                                </td>
                                <td className="py-3.5 px-4 text-slate-600">
                                  {rp.location || 'Warehouse Bay'}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      rp.isActive
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}
                                  >
                                    <span>{rp.isActive ? 'Active' : 'Inactive'}</span>
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right space-x-1.5">
                                  <button
                                    onClick={() => handleOpenEditPoint(rp)}
                                    className="px-2 py-1 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      setConfirmDeleteItem({
                                        id: rp._id,
                                        code: rp.pointCode,
                                        name: rp.name,
                                      })
                                    }
                                    className="px-2 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg border border-rose-200 text-[11px] font-medium transition-colors cursor-pointer"
                                  >
                                    🗑️ Soft-Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          ))}

                        {activeTab === 'delivery-points' &&
                          (deliveryPoints.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400">
                                No delivery points found.
                              </td>
                            </tr>
                          ) : (
                            deliveryPoints.map((dp) => (
                              <tr key={dp._id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                  {dp.pointCode}
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                                  Auto-assigned
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900">{dp.name}</div>
                                </td>
                                <td className="py-3.5 px-4 text-slate-600">
                                  {dp.location || 'Outbound Dock'}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      dp.isActive
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}
                                  >
                                    <span>{dp.isActive ? 'Active' : 'Inactive'}</span>
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right space-x-1.5">
                                  <button
                                    onClick={() => handleOpenEditPoint(dp)}
                                    className="px-2 py-1 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      setConfirmDeleteItem({
                                        id: dp._id,
                                        code: dp.pointCode,
                                        name: dp.name,
                                      })
                                    }
                                    className="px-2 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg border border-rose-200 text-[11px] font-medium transition-colors cursor-pointer"
                                  >
                                    🗑️ Soft-Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Total {pagination.total} records registered in this catalog
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => fetchData(pagination.page - 1, true)}
                    disabled={pagination.page <= 1 || loading}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium"
                  >
                    &larr; Prev
                  </button>
                  <span className="font-semibold text-slate-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => fetchData(pagination.page + 1, true)}
                    disabled={pagination.page >= pagination.totalPages || loading}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* ---------------- CREATE MODAL ---------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Add New{' '}
                  {activeTab === 'products'
                    ? 'Product'
                    : activeTab === 'components'
                    ? 'Component'
                    : 'Location Point'}
                </h3>
                <p className="text-xs text-slate-400">Codes and Barcodes must be unique.</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              {activeTab === 'products' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Product Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. REF-WDN-2B6, AC-INV-1.5T"
                      value={productForm.productCode}
                      onChange={(e) =>
                        setProductForm({ ...productForm, productCode: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Product Barcode (Optional SKU)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 8941234567890"
                      value={productForm.barcode}
                      onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Product Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Refrigerator, Air Conditioner"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Model Number</label>
                      <input
                        type="text"
                        placeholder="e.g. WDN-2B6-RXXX"
                        value={productForm.modelNumber}
                        onChange={(e) =>
                          setProductForm({ ...productForm, modelNumber: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Category</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Appliances, HVAC"
                        value={productForm.category}
                        onChange={(e) =>
                          setProductForm({ ...productForm, category: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Optional specifications..."
                      value={productForm.description}
                      onChange={(e) =>
                        setProductForm({ ...productForm, description: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </>
              )}

              {activeTab === 'components' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Component Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. COMP-INV-01, COND-CU-02"
                      value={componentForm.componentCode}
                      onChange={(e) =>
                        setComponentForm({ ...componentForm, componentCode: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Component Barcode (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 94A600321852"
                      value={componentForm.barcode}
                      onChange={(e) =>
                        setComponentForm({ ...componentForm, barcode: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Component Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Compressor, Inverter PCB"
                      value={componentForm.name}
                      onChange={(e) => setComponentForm({ ...componentForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Category</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mechanical, Electrical"
                      value={componentForm.category}
                      onChange={(e) =>
                        setComponentForm({ ...componentForm, category: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Specifications</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Rotary Inverter R600a..."
                      value={componentForm.specifications}
                      onChange={(e) =>
                        setComponentForm({ ...componentForm, specifications: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </>
              )}

              {(activeTab === 'receive-points' || activeTab === 'delivery-points') && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Point Code</label>
                    <input
                      type="text"
                      required
                      placeholder={
                        activeTab === 'receive-points' ? 'e.g. RP-REF-03' : 'e.g. DP-REF-03'
                      }
                      value={pointForm.pointCode}
                      onChange={(e) => setPointForm({ ...pointForm, pointCode: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Point Name</label>
                    <input
                      type="text"
                      required
                      placeholder={
                        activeTab === 'receive-points'
                          ? 'e.g. Warehouse Bay 3 Intake'
                          : 'e.g. Outbound Logistics Dock 3'
                      }
                      value={pointForm.name}
                      onChange={(e) => setPointForm({ ...pointForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Physical Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Building B Gate 2"
                      value={pointForm.location}
                      onChange={(e) => setPointForm({ ...pointForm, location: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Register Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- EDIT MODAL ---------------- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Catalog Item</h3>
                <p className="text-xs text-slate-400">Update master specifications.</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs">
              {activeTab === 'products' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Product Name</label>
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Product Barcode</label>
                    <input
                      type="text"
                      value={productForm.barcode}
                      onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Model Number</label>
                    <input
                      type="text"
                      value={productForm.modelNumber}
                      onChange={(e) =>
                        setProductForm({ ...productForm, modelNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={productForm.description}
                      onChange={(e) =>
                        setProductForm({ ...productForm, description: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </>
              )}

              {activeTab === 'components' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Component Name</label>
                    <input
                      type="text"
                      required
                      value={componentForm.name}
                      onChange={(e) => setComponentForm({ ...componentForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Component Barcode</label>
                    <input
                      type="text"
                      value={componentForm.barcode}
                      onChange={(e) =>
                        setComponentForm({ ...componentForm, barcode: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Specifications</label>
                    <textarea
                      rows={2}
                      value={componentForm.specifications}
                      onChange={(e) =>
                        setComponentForm({ ...componentForm, specifications: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </>
              )}

              {(activeTab === 'receive-points' || activeTab === 'delivery-points') && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Point Name</label>
                    <input
                      type="text"
                      required
                      value={pointForm.name}
                      onChange={(e) => setPointForm({ ...pointForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Physical Location</label>
                    <input
                      type="text"
                      value={pointForm.location}
                      onChange={(e) => setPointForm({ ...pointForm, location: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- SOFT DELETE CONFIRMATION ---------------- */}
      <ConfirmationModal
        isOpen={!!confirmDeleteItem}
        title={`Soft-Deactivate ${confirmDeleteItem?.code}?`}
        message={`Are you sure you want to remove "${confirmDeleteItem?.name}" from active operational catalogs?`}
        warningText="In-Use Preservation Rule: If this master record has ever been used in an inventory transaction or component binding, hard deletion is prohibited by the database. The record will be safely soft-deactivated (isDeleted: true, isActive: false) to maintain 100% ledger audit integrity."
        confirmLabel="Deactivate / Soft-Delete"
        isDestructive={true}
        isLoading={actionLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteItem(null)}
      />
    </ProtectedRoute>
  );
}
