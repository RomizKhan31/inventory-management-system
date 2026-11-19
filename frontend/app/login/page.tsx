'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/src/context/AuthContext';
import {
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Cpu,
  ArrowDownToLine,
  Truck,
  BarChart3,
  Lock,
} from 'lucide-react';

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
        {/* Header Title with Walton Logo */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto relative flex items-center justify-center">
            <Image
              src="/walton_logo.webp"
              alt="Walton Logo"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
              priority
            />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Inventory Portal Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Walton Hi-Tech Industries PLC • Discrete Manufacturing IMS
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-800 space-y-1">
              <p className="font-semibold flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Authentication Failed</span>
              </p>
              <p className="text-rose-700 pl-5">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Employee ID or Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 bg-slate-50 focus:bg-white transition-all font-mono placeholder:font-sans"
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
                  className="text-xs text-sky-600 hover:text-sky-800 font-medium cursor-pointer flex items-center space-x-1"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 bg-slate-50 focus:bg-white transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Authenticate Session</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo 1-Click Role Login Selector */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Quick Role Switch (1-Click Fill)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoRole('ADMIN01')}
                className="p-2.5 border border-slate-200 rounded-xl hover:border-sky-500 hover:bg-sky-50/50 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-1.5 font-bold text-slate-900 group-hover:text-sky-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>System Admin</span>
                </div>
                <span className="text-slate-400 text-[11px] font-mono mt-0.5 block">ADMIN01</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('66798')}
                className="p-2.5 border border-slate-200 rounded-xl hover:border-sky-500 hover:bg-sky-50/50 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-1.5 font-bold text-slate-900 group-hover:text-sky-700">
                  <Cpu className="w-3.5 h-3.5 text-sky-600" />
                  <span>Tracker</span>
                </div>
                <span className="text-slate-400 text-[11px] font-mono mt-0.5 block">66798</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('58877')}
                className="p-2.5 border border-slate-200 rounded-xl hover:border-sky-500 hover:bg-sky-50/50 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-1.5 font-bold text-slate-900 group-hover:text-sky-700">
                  <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Receive Officer</span>
                </div>
                <span className="text-slate-400 text-[11px] font-mono mt-0.5 block">58877</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('54671')}
                className="p-2.5 border border-slate-200 rounded-xl hover:border-sky-500 hover:bg-sky-50/50 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-1.5 font-bold text-slate-900 group-hover:text-sky-700">
                  <Truck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Delivery Officer</span>
                </div>
                <span className="text-slate-400 text-[11px] font-mono mt-0.5 block">54671</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('VIEW01')}
                className="col-span-2 p-2.5 border border-slate-200 rounded-xl hover:border-sky-500 hover:bg-sky-50/50 text-left transition-colors cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center space-x-1.5 font-bold text-slate-900 group-hover:text-sky-700">
                  <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Report Viewer</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Read-Only)</span>
                </div>
                <span className="text-slate-400 text-[11px] font-mono">VIEW01</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              Demo password: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">Walton@2026</code>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <p className="text-center text-[11px] text-slate-400">
          Account provisioning is managed by System Administrators.
        </p>
      </div>
    </div>
  );
}
