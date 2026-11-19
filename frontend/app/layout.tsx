import type { Metadata } from 'next';
import './globals.css';
import { ReactNode } from 'react';
import { AuthProvider } from '@/src/context/AuthContext';
import { AppHeader } from '@/src/components/layout/AppHeader';
import { AppFooter } from '@/src/components/layout/AppFooter';

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

          <AppFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
