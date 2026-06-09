import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, AlertCircle } from 'lucide-react';

interface ValidationStatusProps {
  isValid: boolean | null;
  message?: string;
  className?: string;
}

export default function ValidationStatus({ isValid, message, className }: ValidationStatusProps) {
  if (isValid === null) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold animate-fade-in",
      isValid 
        ? "bg-green-500/10 text-green-500 border border-green-500/20" 
        : "bg-red-500/10 text-red-500 border border-red-500/20",
      className
    )}>
      {isValid ? (
        <Check className="w-4 h-4 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
      )}
      {message && <span>{message}</span>}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  error?: string;
  success?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, error, success, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-bold text-[var(--text-primary)]">
        {label}
      </label>
      {children}
      {error && <ValidationStatus isValid={false} message={error} />}
      {success && <ValidationStatus isValid={true} message={success} />}
    </div>
  );
}
