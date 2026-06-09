import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatTrendProps {
  currentValue: number;
  previousValue: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function StatTrend({ currentValue, previousValue, label, size = 'md', className }: StatTrendProps) {
  const [difference, setDifference] = useState(0);
  const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral');

  useEffect(() => {
    if (previousValue === 0) {
      setTrend(currentValue > 0 ? 'up' : 'neutral');
      setDifference(currentValue);
    } else {
      const diff = currentValue - previousValue;
      setDifference(Math.abs(diff));
      setTrend(diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral');
    }
  }, [currentValue, previousValue]);

  const trendConfig = {
    up: { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
    down: { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
    neutral: { icon: Minus, color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--bg-tertiary)]' },
  };

  const { icon: Icon, color, bg } = trendConfig[trend];

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const percentage = previousValue > 0 ? Math.round((difference / previousValue) * 100) : 0;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn("p-1.5 rounded-lg", bg)}>
        <Icon className={cn("w-3.5 h-3.5", color)} />
      </div>
      <div>
        <span className={cn("font-bold", sizeClasses[size], color)}>
          {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{difference} ({percentage}%)
        </span>
        <span className={cn("text-[var(--text-secondary)] ml-1", sizeClasses[size])}>
          {label}
        </span>
      </div>
    </div>
  );
}
