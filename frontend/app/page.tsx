'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/src/lib/api';
import { HealthCheckResponse } from '@/src/types/api';

export default function HomePage() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<HealthCheckResponse>('/health');
      setHealth(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to communicate with Express API backend';
      setError(msg);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const data = await api.get<HealthCheckResponse>('/health');
        if (isMounted) {
          setHealth(data);
          setLastChecked(new Date().toLocaleTimeString());
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to communicate with Express API backend';
          setError(msg);
          setHealth(null);
          setLoading(false);
        }
      }
    };

    fetchInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-sky-900 to-slate-900 rounded-2xl p-8 text-white shadow-md">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 bg-sky-500/20 text-sky-300 text-xs font-semibold px-3 py-1 rounded-full border border-sky-400/30">
            <span>Phase 4: Development</span>
            <span>•</span>
            <span>Day 1 of 10 Initialized</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            Industrial Discrete Manufacturing Inventory Management System
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Engineered for high-throughput serialization tracking across component assembly,
            warehouse intake, and dock delivery with an append-only event ledger in MongoDB Atlas.
          </p>
        </div>
      </div>

      {/* Live System Health Diagnostic Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <span>Frontend-to-Backend Health Diagnostic</span>
              {loading ? (
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium animate-pulse">
                  Checking...
                </span>
              ) : health?.status === 'UP' ? (
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>ONLINE & HEALTHY</span>
                </span>
              ) : (
                <span className="text-xs bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full font-semibold border border-rose-200">
                  DISCONNECTED
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Target API: <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}</code>
              {lastChecked && ` • Last verified at ${lastChecked}`}
            </p>
          </div>

          <button
            onClick={checkHealth}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center space-x-2 cursor-pointer"
          >
            <span>Re-check Connectivity</span>
          </button>
        </div>

        {/* Diagnostic Grid */}
        {error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm text-rose-800 space-y-2">
            <p className="font-semibold flex items-center space-x-1.5">
              <span>⚠️ Communication Error</span>
            </p>
            <p className="text-xs text-rose-700">{error}</p>
            <p className="text-xs text-slate-500">
              Ensure the backend Express server is running on port 5000: <code className="bg-white px-1.5 py-0.5 rounded border border-rose-200">npm run dev</code> in backend folder.
            </p>
          </div>
        ) : health ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                API Status
              </span>
              <p className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>{health.status} ({health.environment})</span>
              </p>
              <p className="text-xs text-slate-500">
                Uptime: {health.uptimeSeconds}s • Version: v{health.version}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                MongoDB Connection
              </span>
              <p className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${health.database.status === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                <span className="capitalize">{health.database.state}</span>
              </p>
              <p className="text-xs text-slate-500">
                Host: {health.database.host} • DB: {health.database.name}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Node.js Runtime
              </span>
              <p className="text-base font-bold text-slate-900">
                {health.process.nodeVersion}
              </p>
              <p className="text-xs text-slate-500">
                Memory: {health.process.memoryUsageMB.heapUsed} MB Heap ({health.process.memoryUsageMB.rss} MB RSS)
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Phase Roadmap Progress Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>Phase 1 (1 Day)</span>
            <span>✅ Approved</span>
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Requirement Analysis</h4>
          <p className="text-xs text-slate-600">
            Full Software Requirements Specification (SRS), 5 roles, rules BR-01 to BR-23.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>Phase 2 (2 Days)</span>
            <span>✅ Approved</span>
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Process Flow Diagrams</h4>
          <p className="text-xs text-slate-600">
            Role swimlanes, 8 workflow models, state machines, and 13 exception paths.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>Phase 3 (2 Days)</span>
            <span>✅ Approved</span>
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Database Architecture</h4>
          <p className="text-xs text-slate-600">
            Mongoose schemas, append-only immutability, derived stock aggregation, seed script.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-sky-300 bg-sky-50/40 shadow-sm space-y-2 ring-1 ring-sky-300">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-800">
            <span>Phase 4 (10 Days)</span>
            <span className="text-sky-600 animate-pulse">● In Progress</span>
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Development: Day 1</h4>
          <p className="text-xs text-slate-600">
            Full-stack initialization, TypeScript configuration, health-check API & CORS.
          </p>
        </div>
      </div>
    </div>
  );
}
