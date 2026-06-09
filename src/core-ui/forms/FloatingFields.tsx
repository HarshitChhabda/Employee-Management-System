import React from 'react';
import { cn } from '@/lib/utils';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const FloatingInput = ({ label, error, icon, className, ...props }: FloatingInputProps) => {
  return (
    <div className="form-floating-group position-relative mb-3">
      <div className={cn(
        "form-floating border rounded-3 transition-all duration-300 hover:shadow-md",
        error ? "border-red-500" : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]",
        "focus-within:border-blue-500 focus-within:shadow-lg focus-within:shadow-blue-500/10 bg-[var(--bg-card)]"
      )}>
        {icon && (
          <div className="position-absolute translate-middle-y top-50 start-0 ms-3 text-[var(--text-secondary)] opacity-50 transition-all duration-300 focus-within:opacity-100 focus-within:text-blue-500">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={cn(
            "form-control border-0 bg-transparent px-4 pt-4 pb-2 transition-all duration-300 focus:outline-none",
            icon && "ps-5",
            className
          )}
          placeholder={label}
          id={props.id || label.replace(/\s+/g, '-').toLowerCase()}
        />
        <label 
          htmlFor={props.id || label.replace(/\s+/g, '-').toLowerCase()}
          className={cn("text-[var(--text-secondary)] fw-bold text-uppercase transition-all duration-300", icon && "ms-4")}
          style={{ fontSize: '0.65rem', letterSpacing: '0.05em', top: '2px' }}
        >
          {label}
        </label>
      </div>
      {error && <div className="text-red-500 small fw-bold mt-1 ms-2 animate-fade-in" style={{ fontSize: '0.7rem' }}>{error}</div>}
    </div>
  );
};

interface FloatingSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  options: { value: string; label: string }[];
}

export const FloatingSelect = ({ label, error, icon, options, className, ...props }: FloatingSelectProps) => {
  return (
    <div className="form-floating-group position-relative mb-3">
      <div className={cn(
        "form-floating border rounded-3 transition-all duration-300 hover:shadow-md",
        error ? "border-red-500" : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]",
        "focus-within:border-blue-500 focus-within:shadow-lg focus-within:shadow-blue-500/10 bg-[var(--bg-card)]"
      )}>
        {icon && (
          <div className="position-absolute translate-middle-y top-50 start-0 ms-3 text-[var(--text-secondary)] opacity-50 transition-all duration-300 focus-within:opacity-100 focus-within:text-blue-500" style={{ zIndex: 10 }}>
            {icon}
          </div>
        )}
        <select
          {...props}
          className={cn(
            "form-select border-0 bg-transparent px-4 pt-4 pb-2 transition-all duration-300 focus:outline-none cursor-pointer",
            icon && "ps-5",
            className
          )}
          id={props.id || label.replace(/\s+/g, '-').toLowerCase()}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <label 
          htmlFor={props.id || label.replace(/\s+/g, '-').toLowerCase()}
          className={cn("text-[var(--text-secondary)] fw-bold text-uppercase transition-all duration-300", icon && "ms-4")}
          style={{ fontSize: '0.65rem', letterSpacing: '0.05em', top: '2px' }}
        >
          {label}
        </label>
      </div>
      {error && <div className="text-red-500 small fw-bold mt-1 ms-2 animate-fade-in" style={{ fontSize: '0.7rem' }}>{error}</div>}
    </div>
  );
};
