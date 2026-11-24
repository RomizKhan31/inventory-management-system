import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";
import { AuthProvider } from "@/src/context/AuthContext";
import { LayoutProvider } from "@/src/context/LayoutContext";
import { AppShell } from "@/src/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Walton Inventory Management System",
  description:
    "Industrial Discrete Manufacturing Barcode Inventory Tracking & Lifecycle System",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <LayoutProvider>
            <AppShell>{children}</AppShell>
          </LayoutProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
