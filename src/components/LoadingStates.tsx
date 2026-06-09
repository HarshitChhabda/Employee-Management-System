import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export default function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <Loader2 className={cn("animate-spin text-blue-500", sizeClasses[size])} />
      {text && <p className="text-sm font-bold text-[var(--text-secondary)] animate-pulse">{text}</p>}
    </div>
  );
}

interface PageLoaderProps {
  text?: string;
  className?: string;
}

export function PageLoader({ text = 'Loading...', className }: PageLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[60vh] gap-6", className)}>
      <div className="relative">
        <div className="w-16 h-16 border-4 border-[var(--border-primary)] rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-lg font-black text-[var(--text-primary)]">{text}</p>
        <p className="text-sm text-[var(--text-secondary)] mt-1">कृपया प्रतीक्षा करें...</p>
      </div>
    </div>
  );
}

interface SkeletonLoaderProps {
  rows?: number;
  className?: string;
}

export function SkeletonLoader({ rows = 5, className }: SkeletonLoaderProps) {
  return (
    <div className={cn("space-y-4 animate-pulse", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[var(--bg-tertiary)] rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-3/4" />
            <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/2" />
          </div>
          <div className="w-20 h-8 bg-[var(--bg-tertiary)] rounded-lg" />
        </div>
      ))}
    </div>
  );
}

interface DataTableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function DataTableSkeleton({ rows = 5, columns = 4, className }: DataTableSkeletonProps) {
  return (
    <div className={cn("space-y-3 animate-pulse", className)}>
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex-1 h-8 bg-[var(--bg-tertiary)] rounded-lg" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1 h-10 bg-[var(--bg-tertiary)] rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
