import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const shortcuts = useKeyboardShortcuts();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-2xl animate-scale-in overflow-hidden backdrop-blur-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Keyboard className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--text-primary)]">Keyboard Shortcuts</h2>
              <p className="text-xs text-[var(--text-secondary)] font-bold">कीबोर्ड शॉर्टकट</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-all hover:scale-110 hover:rotate-90"
          >
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl hover:border-[var(--border-secondary)] transition-all duration-300"
              >
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {shortcut.description}
                </span>
                <div className="flex items-center gap-1">
                  {shortcut.ctrlKey && (
                    <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-xs font-mono font-bold text-[var(--text-secondary)]">
                      Ctrl
                    </kbd>
                  )}
                  {shortcut.shiftKey && (
                    <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-xs font-mono font-bold text-[var(--text-secondary)]">
                      Shift
                    </kbd>
                  )}
                  {shortcut.altKey && (
                    <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-xs font-mono font-bold text-[var(--text-secondary)]">
                      Alt
                    </kbd>
                  )}
                  <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-xs font-mono font-bold text-[var(--text-secondary)]">
                    {shortcut.key}
                  </kbd>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-primary)] bg-[var(--bg-tertiary)]/30">
          <p className="text-xs text-[var(--text-secondary)] text-center">
            Press <kbd className="px-2 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded text-[10px] font-mono font-bold">Ctrl + K</kbd> to open Quick Actions
          </p>
        </div>
      </div>
    </div>
  );
}
