'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  X,
} from 'lucide-react';
import { ProtectedRoute } from '@/src/components/auth/ProtectedRoute';
import { AdminStatsCards } from '@/src/components/admin/AdminStatsCards';
import { ConfirmationModal } from '@/src/components/common/ConfirmationModal';
import { ToastNotification, ToastMessage } from '@/src/components/common/ToastNotification';
import { api, ApiClientError } from '@/src/lib/api';
import { IUserItem, IPaginationMeta } from '@/src/types/admin';
import { ApiResponse } from '@/src/types/api';
import { UserRole } from '@/src/types/auth';
import { useAuth } from '@/src/context/AuthContext';

interface UserListResponse {
  data: IUserItem[];
  meta?: IPaginationMeta;
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();

  // State
  const [users, setUsers] = useState<IUserItem[]>([]);
  const [pagination, setPagination] = useState<IPaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [confirmDeactUser, setConfirmDeactUser] = useState<IUserItem | null>(null);
  const [selectedUser, setSelectedUser] = useState<IUserItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    userCode: '',
    name: '',
    email: '',
    password: '',
    role: 'COMPONENT_TRACKER' as UserRole,
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
  });

  // Role Form State
  const [targetRole, setTargetRole] = useState<UserRole>('COMPONENT_TRACKER');

  // Load Users manually
  const fetchUsers = useCallback(
    async (page = 1, showSpinner = true) => {
      if (showSpinner) setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '10',
        });
        if (search.trim()) params.append('search', search.trim());
        if (roleFilter !== 'ALL') params.append('role', roleFilter);
        if (statusFilter !== 'ALL') params.append('isActive', statusFilter);

        const res = await api.get<ApiResponse<IUserItem[]> & UserListResponse>(
          `/users?${params.toString()}`
        );
        if (res.success && res.data) {
          setUsers(res.data);
          if (res.meta) {
            setPagination(res.meta);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof ApiClientError ? err.message : 'Failed to load user accounts';
        setToast({ type: 'error', text: msg });
      } finally {
        setLoading(false);
      }
    },
    [search, roleFilter, statusFilter]
  );

  useEffect(() => {
    let isMounted = true;
    const initialLoad = async () => {
      try {
        const params = new URLSearchParams({ page: '1', limit: '10' });
        if (search.trim()) params.append('search', search.trim());
        if (roleFilter !== 'ALL') params.append('role', roleFilter);
        if (statusFilter !== 'ALL') params.append('isActive', statusFilter);

        const res = await api.get<ApiResponse<IUserItem[]> & UserListResponse>(
          `/users?${params.toString()}`
        );
        if (isMounted && res.success && res.data) {
          setUsers(res.data);
          if (res.meta) setPagination(res.meta);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof ApiClientError ? err.message : 'Failed to load user accounts';
          setToast({ type: 'error', text: msg });
          setLoading(false);
        }
      }
    };

    initialLoad();
    return () => {
      isMounted = false;
    };
  }, [search, roleFilter, statusFilter]);

  // Handle Search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, true);
  };

  // 1. Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post<ApiResponse<IUserItem>>('/users', createForm);
      if (res.success && res.data) {
        setToast({ type: 'success', text: `User ${res.data.userCode} registered successfully.` });
        setIsCreateOpen(false);
        setCreateForm({
          userCode: '',
          name: '',
          email: '',
          password: '',
          role: 'COMPONENT_TRACKER',
        });
        fetchUsers(1, true);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to create user';
      setToast({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Edit User Info
  const handleOpenEdit = (user: IUserItem) => {
    setSelectedUser(user);
    setEditForm({ name: user.name, email: user.email });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await api.put<ApiResponse<IUserItem>>(`/users/${selectedUser.id}`, editForm);
      if (res.success) {
        setToast({ type: 'success', text: `User ${selectedUser.userCode} updated successfully.` });
        setIsEditOpen(false);
        fetchUsers(pagination.page, false);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to update user';
      setToast({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Change Role
  const handleOpenRoleModal = (user: IUserItem) => {
    setSelectedUser(user);
    setTargetRole(user.role);
    setIsRoleModalOpen(true);
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await api.patch<ApiResponse<IUserItem>>(`/users/${selectedUser.id}/role`, {
        role: targetRole,
      });
      if (res.success) {
        setToast({
          type: 'success',
          text: `Role for ${selectedUser.userCode} changed to ${targetRole}.`,
        });
        setIsRoleModalOpen(false);
        fetchUsers(pagination.page, false);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to update user role';
      setToast({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Toggle Active Status (Soft Deactivation)
  const handleToggleStatus = async (user: IUserItem) => {
    if (user.isActive) {
      setConfirmDeactUser(user);
    } else {
      try {
        const res = await api.patch<ApiResponse<IUserItem>>(`/users/${user.id}/status`, {
          isActive: true,
        });
        if (res.success) {
          setToast({ type: 'success', text: `Account ${user.userCode} re-activated.` });
          fetchUsers(pagination.page, false);
        }
      } catch (err: unknown) {
        const msg = err instanceof ApiClientError ? err.message : 'Failed to reactivate user';
        setToast({ type: 'error', text: msg });
      }
    }
  };

  const confirmDeactivation = async () => {
    if (!confirmDeactUser) return;
    setActionLoading(true);
    try {
      const res = await api.patch<ApiResponse<IUserItem>>(
        `/users/${confirmDeactUser.id}/status`,
        { isActive: false }
      );
      if (res.success) {
        setToast({
          type: 'success',
          text: `Account ${confirmDeactUser.userCode} soft-deactivated. Historical logs remain preserved.`,
        });
        setConfirmDeactUser(null);
        fetchUsers(pagination.page, false);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to deactivate user';
      setToast({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'COMPONENT_TRACKER':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'RECEIVE_USER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DELIVERY_USER':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'REPORT_VIEWER':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="space-y-6">
        <AdminStatsCards />

        <ToastNotification toast={toast} onClose={() => setToast(null)} />

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Administration
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    User Management
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                  User Accounts &amp; Single-Role Management
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Create manufacturing operator credentials, assign strictly one role, and soft-deactivate accounts.
                </p>
              </div>

              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add New User</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
              <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search by Employee ID, Name, or Email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
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
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                >
                  <option value="ALL">All Roles</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="COMPONENT_TRACKER">COMPONENT_TRACKER</option>
                  <option value="RECEIVE_USER">RECEIVE_USER</option>
                  <option value="DELIVERY_USER">DELIVERY_USER</option>
                  <option value="REPORT_VIEWER">REPORT_VIEWER</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
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
                      <th className="py-3 px-4">Operator</th>
                      <th className="py-3 px-4">Employee ID</th>
                      <th className="py-3 px-4">Single Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Registered</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          Loading operators...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          No operator records found matching current criteria.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const isSelf = currentUser?.userCode === u.userCode;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">{u.name}</div>
                              <div className="text-[11px] text-slate-400">{u.email}</div>
                            </td>

                            <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                              {u.userCode}
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getRoleBadgeClass(
                                  u.role
                                )}`}
                              >
                                {u.role}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  u.isActive
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    u.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`}
                                ></span>
                                <span>{u.isActive ? 'Active' : 'Deactivated'}</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>

                            <td className="py-3.5 px-4 text-right space-x-1.5">
                              <button
                                onClick={() => handleOpenEdit(u)}
                                title="Edit Name & Email"
                                className="px-2 py-1 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={() => handleOpenRoleModal(u)}
                                title="Change Assigned Role"
                                className="px-2 py-1 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <Shield className="w-3 h-3" />
                                <span>Role</span>
                              </button>

                              <button
                                onClick={() => handleToggleStatus(u)}
                                disabled={isSelf}
                                title={
                                  isSelf
                                    ? 'Cannot deactivate self'
                                    : u.isActive
                                    ? 'Soft-Deactivate User'
                                    : 'Reactivate User'
                                }
                                className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                  u.isActive
                                    ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                {u.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {users.length} of {pagination.total} registered operators
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => fetchUsers(pagination.page - 1, true)}
                    disabled={pagination.page <= 1 || loading}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium"
                  >
                    &larr; Prev
                  </button>
                  <span className="font-semibold text-slate-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => fetchUsers(pagination.page + 1, true)}
                    disabled={pagination.page >= pagination.totalPages || loading}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>

      {/* ---------------- CREATE USER MODAL ---------------- */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Operator Account</h3>
                <p className="text-xs text-slate-400">All fields required. Assigns strictly 1 role.</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Employee Code / Badge Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 66798, 58877, EMP-104"
                  value={createForm.userCode}
                  onChange={(e) => setCreateForm({ ...createForm, userCode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 uppercase font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mohammad Ali"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. operator@waltonbd.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Temporary Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Single Assigned Role (Mutual Exclusivity)
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 font-semibold"
                >
                  <option value="COMPONENT_TRACKER">COMPONENT_TRACKER (Assembly Station)</option>
                  <option value="RECEIVE_USER">RECEIVE_USER (Warehouse Intake)</option>
                  <option value="DELIVERY_USER">DELIVERY_USER (Outbound Docks)</option>
                  <option value="REPORT_VIEWER">REPORT_VIEWER (Read-Only Analytics)</option>
                  <option value="ADMIN">ADMIN (Full System Administration)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Register Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- EDIT USER MODAL ---------------- */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Profile: {selectedUser.userCode}
                </h3>
                <p className="text-xs text-slate-400">Update operator personal information.</p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Update Information'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- CHANGE ROLE MODAL ---------------- */}
      {isRoleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Assign Role: {selectedUser.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono">Employee ID: {selectedUser.userCode}</p>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRoleSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-xs">
                <span className="font-bold">Current Assigned Role: </span>
                <span className="font-mono">{selectedUser.role}</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select New Operational Role
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 font-semibold"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="COMPONENT_TRACKER">COMPONENT_TRACKER</option>
                  <option value="RECEIVE_USER">RECEIVE_USER</option>
                  <option value="DELIVERY_USER">DELIVERY_USER</option>
                  <option value="REPORT_VIEWER">REPORT_VIEWER</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Walton policy: Every operator has exactly one role. Changing the role modifies their station permissions immediately.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Confirm Role Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- SOFT DEACTIVATION CONFIRMATION ---------------- */}
      <ConfirmationModal
        isOpen={!!confirmDeactUser}
        title="Soft-Deactivate Operator Account?"
        message={`Are you sure you want to deactivate employee account "${confirmDeactUser?.name}" (${confirmDeactUser?.userCode})?`}
        warningText="In accordance with Walton discrete manufacturing policies, user accounts are NEVER permanently erased. Soft-deactivating revokes session access and login privileges while preserving full historical traceability across the audit ledger."
        confirmLabel="Deactivate Account"
        isDestructive={true}
        isLoading={actionLoading}
        onConfirm={confirmDeactivation}
        onCancel={() => setConfirmDeactUser(null)}
      />
    </ProtectedRoute>
  );
}
