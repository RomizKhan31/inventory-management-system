'use client';

import React, { useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { Key, X, AlertCircle, CheckCircle2, Eye, EyeOff, Check, Dot } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal = ({ isOpen, onClose }: ChangePasswordModalProps) => {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  // Real-time password criteria
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const isDifferentFromCurrent = currentPassword.length > 0 && newPassword.length > 0 ? currentPassword !== newPassword : true;
  const isConfirmed = confirmPassword.length > 0 && newPassword === confirmPassword;

  const allCriteriaMet = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  const handleClose = () => {
    if (loading) return;
    setError(null);
    setSuccess(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Current password is required');
      return;
    }

    if (!hasMinLength) {
      setError('New password must be at least 8 characters long');
      return;
    }

    if (!hasUppercase) {
      setError('New password must contain at least one uppercase letter (A-Z)');
      return;
    }

    if (!hasLowercase) {
      setError('New password must contain at least one lowercase letter (a-z)');
      return;
    }

    if (!hasNumber) {
      setError('New password must contain at least one number (0-9)');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from your current password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-slate-900 text-base">Change Password</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Password updated successfully!</span>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 focus:bg-white transition-colors"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 focus:bg-white transition-colors"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password requirements visual helper */}
            <div className="mt-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] space-y-1">
              <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Password Requirements</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
                <div className={`flex items-center space-x-1 ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                  {hasMinLength ? <Check className="w-3 h-3 text-emerald-600" /> : <Dot className="w-3 h-3 text-slate-400" />}
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center space-x-1 ${hasUppercase ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                  {hasUppercase ? <Check className="w-3 h-3 text-emerald-600" /> : <Dot className="w-3 h-3 text-slate-400" />}
                  <span>Uppercase (A-Z)</span>
                </div>
                <div className={`flex items-center space-x-1 ${hasLowercase ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                  {hasLowercase ? <Check className="w-3 h-3 text-emerald-600" /> : <Dot className="w-3 h-3 text-slate-400" />}
                  <span>Lowercase (a-z)</span>
                </div>
                <div className={`flex items-center space-x-1 ${hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                  {hasNumber ? <Check className="w-3 h-3 text-emerald-600" /> : <Dot className="w-3 h-3 text-slate-400" />}
                  <span>Number (0-9)</span>
                </div>
              </div>
              {currentPassword && newPassword && !isDifferentFromCurrent && (
                <p className="text-rose-600 text-[10px] pt-1">New password must be different from current password</p>
              )}
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`w-full pl-3 pr-10 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 bg-slate-50 focus:bg-white transition-colors ${
                  confirmPassword && !isConfirmed
                    ? 'border-rose-300 focus:ring-rose-500'
                    : confirmPassword && isConfirmed
                    ? 'border-emerald-300 focus:ring-emerald-500'
                    : 'border-slate-200 focus:ring-sky-500'
                }`}
                placeholder="Re-enter new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && !isConfirmed && (
              <p className="text-[11px] text-rose-600 mt-1">Passwords do not match</p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success || !allCriteriaMet || !isConfirmed || !isDifferentFromCurrent}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center space-x-1"
            >
              {loading ? <span>Updating...</span> : <span>Update Password</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
