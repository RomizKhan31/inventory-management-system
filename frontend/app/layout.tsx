import type { Metadata } from 'next';
import './globals.css';
import { ReactNode } from 'react';
import { AuthProvider } from '@/src/context/AuthContext';
import { AppHeader } from '@/src/components/layout/AppHeader';

export const metadata: Metadata = {
  title: 'Walton Inventory Management System',
  description: 'Industrial Discrete Manufacturing Barcode Inventory Tracking & Lifecycle System',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <AuthProvider>
          <AppHeader />

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
        </AuthProvider>
      </body>
    </html>
  );
}
