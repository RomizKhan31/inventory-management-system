'use client';

import React from 'react';
import Image from 'next/image';

/**
 * AppFooter Component:
 * Clean, minimal enterprise footer for Walton Hi-Tech Industries PLC.
 * Displays the official Walton logo, copyright notices, and minimal system details.
 */
export const AppFooter = () => {
  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        {/* Brand & System Identifier */}
        <div className="flex items-center space-x-3">
          <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
            <Image
              src="/walton_logo.webp"
              alt="Walton Logo"
              width={24}
              height={24}
              className="w-6 h-6 object-contain"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-900 tracking-tight">
              Walton Hi-Tech Industries PLC
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">
              Discrete Manufacturing IMS
            </span>
          </div>
        </div>

        {/* Minimal Legal & Access Notice */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
          <span>&copy; 2026 Walton Hi-Tech Industries PLC. All rights reserved.</span>
          <span className="hidden sm:inline text-slate-200">•</span>
          <span className="hidden sm:inline text-slate-400">Internal Enterprise Use Only</span>
        </div>
      </div>
    </footer>
  );
};
