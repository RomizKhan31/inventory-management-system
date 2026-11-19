'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastNotificationProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

const renderToastIcon = (type: ToastMessage['type']) => {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />;
    default:
      return <Info className="w-4 h-4 text-sky-600 shrink-0" />;
  }
};

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const styles = {
    success: 'bg-emerald-50 border-emerald-200/80 text-emerald-900',
    error: 'bg-rose-50 border-rose-200/80 text-rose-900',
    info: 'bg-sky-50 border-sky-200/80 text-sky-900',
  };

  return (
    <div
      role="status"
      className={`p-3.5 rounded-xl border shadow-xs flex items-center justify-between transition-all animate-in fade-in duration-200 ${styles[toast.type]}`}
    >
      <div className="flex items-center space-x-2.5 text-xs font-medium">
        {renderToastIcon(toast.type)}
        <span className="leading-snug">{toast.text}</span>
      </div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 ml-3 p-1 rounded-md hover:bg-black/5 transition-colors cursor-pointer"
        aria-label="Dismiss Notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
