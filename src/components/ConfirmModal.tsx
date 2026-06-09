// ============================================================
// Shared Confirmation Modal
// Extracted from AttendanceExcel.tsx for reuse across app
// ============================================================

import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'warning' | 'danger' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm / पुष्टि करें',
  cancelLabel = 'Cancel / रद्द करें',
  variant = 'warning'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const iconColor = variant === 'danger' ? 'text-red-500' : variant === 'info' ? 'text-blue-500' : 'text-amber-500';
  const iconBg = variant === 'danger' ? 'bg-red-500/10 border-red-500/20' : variant === 'info' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-amber-500/10 border-amber-500/20';
  const confirmBg = variant === 'danger'
    ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/20'
    : 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-blue-500/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-7 max-w-md w-full mx-4 shadow-2xl text-[var(--text-primary)] animate-scale-in hover:shadow-3xl transition-shadow duration-300">
        <div className="flex items-center gap-3.5 mb-5">
          <div className={`w-12 h-12 ${iconBg} border rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse`}>
            <AlertTriangle className={`w-6 h-6 ${iconColor}`} />
          </div>
          <h3 className="text-xl font-black text-[var(--text-primary)]">{title}</h3>
        </div>
        <p className="text-[var(--text-secondary)] font-bold mb-7 text-sm">{message}</p>
        <div className="flex justify-end gap-3.5 font-bold">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-all cursor-pointer text-sm font-black hover:scale-105 active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`px-6 py-2.5 ${confirmBg} hover:opacity-90 text-white rounded-xl transition-all shadow-lg cursor-pointer text-sm font-black hover:scale-105 active:scale-95 hover:shadow-xl`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
