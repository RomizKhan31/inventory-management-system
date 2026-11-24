"use client";

import React, { ReactNode } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { useLayout } from "@/src/context/LayoutContext";
import { AppSidebar } from "./AppSidebar";
import { AppFooter } from "./AppFooter";
import { ChangePasswordModal } from "../auth/ChangePasswordModal";

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const { isPasswordModalOpen, closePasswordModal } = useLayout();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
      {/* Main Layout Area: Sidebar + Main Content (Header completely removed) */}
      <div className="flex-1 flex w-full">
        {isAuthenticated && user && <AppSidebar />}

        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <AppFooter />
        </div>
      </div>

      {/* Global Change Password Modal (Triggered directly from Sidebar) */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={closePasswordModal}
      />
    </div>
  );
};
