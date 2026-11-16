import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Walton Inventory Management System',
  description: 'Industrial Discrete Manufacturing Barcode Inventory Tracking & Lifecycle System',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                W
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-lg leading-tight">
                  WALTON <span className="font-normal text-slate-500">| IMS</span>
                </h1>
                <p className="text-xs text-slate-500">
                  Industrial Attachment Assignment 2026
                </p>
              </div>
            </div>

            <nav className="flex items-center space-x-4 text-sm font-medium text-slate-600">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                System Status
              </Link>
              <a
                href="http://localhost:5000/api/v1/health"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center space-x-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span>API Health</span>
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <p>
              &copy; 2026 Walton Hi-Tech Industries PLC. Industrial Attachment Project.
            </p>
            <p>
              Stack: Next.js 16 • React 19 • Express.js 5 • MongoDB Atlas • TypeScript
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
