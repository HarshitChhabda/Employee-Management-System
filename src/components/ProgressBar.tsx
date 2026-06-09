import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
}

export default function ProgressBar({
  value,
  max = 100,
  color = 'blue',
  showLabel = false,
  size = 'md',
  className,
  animated = true
}: ProgressBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setWidth((value / max) * 100);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setWidth((value / max) * 100);
    }
  }, [value, max, animated]);

  const colorClasses: Record<string, string> = {
    blue: 'bg-gradient-to-r from-blue-500 to-blue-600',
    green: 'bg-gradient-to-r from-green-500 to-green-600',
    purple: 'bg-gradient-to-r from-purple-500 to-purple-600',
    orange: 'bg-gradient-to-r from-orange-500 to-orange-600',
    red: 'bg-gradient-to-r from-red-500 to-red-600',
    teal: 'bg-gradient-to-r from-teal-500 to-teal-600',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const percentage = Math.round((value / max) * 100);

  return (
    <div className={cn('w-full', className)}>
      <div className={cn(
        "w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden",
        sizeClasses[size]
      )}>
        <div
          className={cn(
            "rounded-full transition-all duration-1000 ease-out relative",
            colorClasses[color]
          )}
          style={{ width: `${width}%` }}
        >
          {animated && (
            <div className="absolute inset-0 bg-white/20 animate-shimmer" style={{ backgroundSize: '1000px 100%' }} />
          )}
        </div>
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1.5">
          <span className="text-xs font-bold text-[var(--text-secondary)]">{value}/{max}</span>
          <span className="text-xs font-bold text-[var(--text-secondary)]">{percentage}%</span>
        </div>
      )}
    </div>
  );
}
