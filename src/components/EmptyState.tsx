import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  titleHi?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({ icon: Icon, title, titleHi, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-8",
      "bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl",
      "animate-fade-in",
      className
    )}>
      <div className="w-20 h-20 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] flex items-center justify-center mb-6 animate-pulse-glow">
        <Icon className="w-10 h-10 text-[var(--text-secondary)] opacity-50" />
      </div>
      <h3 className="text-xl font-black text-[var(--text-primary)] mb-2">{title}</h3>
      {titleHi && (
        <p className="text-sm font-bold text-[var(--text-secondary)] mb-2">{titleHi}</p>
      )}
      {description && (
        <p className="text-sm text-[var(--text-secondary)] text-center max-w-md mb-6">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/25"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
