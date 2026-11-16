'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(identifier, password);
      router.push('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const setDemoRole = (userCode: string) => {
    setIdentifier(userCode);
    setPassword('Walton@2026');
    setError(null);
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-sky-600 text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-md">
            W
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign In to Inventory Portal
          </h2>
          <p className="text-xs text-slate-500">
            Authorized Personnel Only • Role-Based Discrete Manufacturing Control
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <p className="font-semibold flex items-center space-x-1.5">
                <span>⚠️ Authentication Alert</span>
              </p>
              <p className="text-rose-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Employee ID / User Code or Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 focus:bg-white transition-all font-mono placeholder:font-sans"
                placeholder="e.g. 66798 or admin@waltonbd.com"
                autoComplete="username"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-sky-600 hover:text-sky-800 font-medium cursor-pointer"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 focus:bg-white transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Authenticate Session</span>
              )}
            </button>
          </form>

          {/* Quick Demo 1-Click Role Login Selector */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
              Quick-Test Demo Credentials (1-Click Fill)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoRole('ADMIN01')}
                className="p-2 border border-slate-200 rounded-lg hover:border-sky-500 hover:bg-sky-50/50 text-left transition-colors cursor-pointer"
              >
                <span className="font-bold text-slate-900 block">👑 System Admin</span>
                <span className="text-slate-500 text-[11px]">ADMIN01</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('66798')}
                className="p-2 border border-slate-200 rounded-lg hover:border-sky-500 hover:bg-sky-50/50 text-left transition-colors cursor-pointer"
              >
                <span className="font-bold text-slate-900 block">🔍 Component Tracker</span>
                <span className="text-slate-500 text-[11px]">66798</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('58877')}
                className="p-2 border border-slate-200 rounded-lg hover:border-sky-500 hover:bg-sky-50/50 text-left transition-colors cursor-pointer"
              >
                <span className="font-bold text-slate-900 block">📥 Receive Officer</span>
                <span className="text-slate-500 text-[11px]">58877</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('54671')}
                className="p-2 border border-slate-200 rounded-lg hover:border-sky-500 hover:bg-sky-50/50 text-left transition-colors cursor-pointer"
              >
                <span className="font-bold text-slate-900 block">🚚 Delivery Officer</span>
                <span className="text-slate-500 text-[11px]">54671</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('VIEW01')}
                className="col-span-2 p-2 border border-slate-200 rounded-lg hover:border-sky-500 hover:bg-sky-50/50 text-left transition-colors cursor-pointer"
              >
                <span className="font-bold text-slate-900 block">📊 Report Viewer (Read-Only)</span>
                <span className="text-slate-500 text-[11px]">VIEW01</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              Default password for all demo accounts: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600 font-mono">Walton@2026</code>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <p className="text-center text-xs text-slate-400">
          Public self-registration is disabled. Contact your System Administrator for new badge provisioning.
        </p>
      </div>
    </div>
  );
}
