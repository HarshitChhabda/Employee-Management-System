import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'outline' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '',
  ...props 
}) => {
  const baseStyles = "rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden btn-enhanced";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-[10px] tracking-wider uppercase",
    md: "px-5 py-2.5 text-xs tracking-wide",
    lg: "px-8 py-3.5 text-sm tracking-widest uppercase",
    icon: "w-10 h-10 p-0",
    "icon-sm": "w-8 h-8 p-0"
  };
  
  const variantStyles = {
    primary: "bg-[var(--accent-blue)] text-white shadow-lg shadow-[var(--accent-blue)]/20 hover:shadow-xl hover:shadow-[var(--accent-blue)]/30 hover:-translate-y-0.5",
    secondary: "bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-primary)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-secondary)] hover:-translate-y-0.5",
    success: "bg-[var(--accent-green)] text-white shadow-lg shadow-[var(--accent-green)]/20 hover:shadow-xl hover:shadow-[var(--accent-green)]/30 hover:-translate-y-0.5",
    danger: "bg-[var(--accent-red)] text-white shadow-lg shadow-[var(--accent-red)]/20 hover:shadow-xl hover:shadow-[var(--accent-red)]/30 hover:-translate-y-0.5",
    warning: "bg-[var(--accent-orange)] text-white shadow-lg shadow-[var(--accent-orange)]/20 hover:shadow-xl hover:shadow-[var(--accent-orange)]/30 hover:-translate-y-0.5",
    ghost: "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] hover:-translate-y-0.5",
    outline: "bg-transparent border-2 border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] hover:-translate-y-0.5",
    gradient: "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5"
  };
  
  return (
    <button 
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
};
