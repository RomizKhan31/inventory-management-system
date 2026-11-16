'use client';

import React from 'react';

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastNotificationProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    info: 'bg-sky-50 border-sky-200 text-sky-800',
  };

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  };

  return (
    <div className={`p-4 rounded-xl border shadow-xs flex items-center justify-between transition-all ${styles[toast.type]}`}>
      <div className="flex items-center space-x-2 text-xs font-semibold">
        <span>{icons[toast.type]}</span>
        <span>{toast.text}</span>
      </div>
      <button
        onClick={onClose}
        className="text-xs text-slate-400 hover:text-slate-700 ml-4 p-1 cursor-pointer"
        aria-label="Dismiss Notification"
      >
        ✕
      </button>
    </div>
  );
};
