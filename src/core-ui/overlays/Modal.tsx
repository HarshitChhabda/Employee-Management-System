import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Modal = ({ show, onClose, title, children, size = 'md', className }: ModalProps) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (show) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [show, onClose]);

  const sizeStyles: Record<string, string> = {
    sm: 'max-w-[400px]',
    md: 'max-w-[600px]',
    lg: 'max-w-[900px]',
    xl: 'max-w-[1200px]'
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div 
        className={cn(
          "relative w-full bg-[var(--bg-card)] rounded-3xl shadow-2xl overflow-hidden border border-[var(--border-primary)] flex flex-col animate-scale-in backdrop-blur-2xl",
          sizeStyles[size],
          className
        )}
        style={{ 
          maxHeight: '90vh'
        }}
      >
        {title && (
          <div className="px-8 py-6 border-b border-[var(--border-primary)] flex items-center justify-between bg-[var(--bg-tertiary)]/30">
            <h2 className="m-0 text-lg font-black text-[var(--text-primary)] uppercase tracking-tight">{title}</h2>
            <button 
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all hover:scale-110 hover:rotate-90 active:scale-95" 
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
        )}
        
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

