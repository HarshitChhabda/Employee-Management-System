import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { BarChart3, TrendingUp, Users, Calendar } from 'lucide-react';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: ChartData[];
  height?: number;
  className?: string;
  animated?: boolean;
}

export default function BarChart({ data, height = 200, className, animated = true }: BarChartProps) {
  const [animatedValues, setAnimatedValues] = useState<number[]>(data.map(() => 0));
  const maxValue = Math.max(...data.map(d => d.value));

  useEffect(() => {
    if (!animated) {
      setAnimatedValues(data.map(d => d.value));
      return;
    }

    const timer = setTimeout(() => {
      setAnimatedValues(data.map(d => d.value));
    }, 100);

    return () => clearTimeout(timer);
  }, [data, animated]);

  const colors = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600',
    'from-purple-500 to-purple-600',
    'from-orange-500 to-orange-600',
    'from-teal-500 to-teal-600',
    'from-red-500 to-red-600',
  ];

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((item, index) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="relative w-full flex justify-center" style={{ height: height - 40 }}>
                <div
                  className={cn(
                    "w-full max-w-[40px] rounded-t-lg bg-gradient-to-t transition-all duration-1000 ease-out relative",
                    item.color || colors[index % colors.length]
                  )}
                  style={{ height: `${animatedValues[index] > 0 ? barHeight : 0}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg text-xs font-bold text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                    {item.value}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[var(--text-secondary)] text-center truncate w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DonutChartProps {
  data: ChartData[];
  size?: number;
  className?: string;
  animated?: boolean;
}

export function DonutChart({ data, size = 160, className, animated = true }: DonutChartProps) {
  const [animatedValues, setAnimatedValues] = useState<number[]>(data.map(() => 0));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  useEffect(() => {
    if (!animated) {
      setAnimatedValues(data.map(d => d.value));
      return;
    }

    const timer = setTimeout(() => {
      setAnimatedValues(data.map(d => d.value));
    }, 100);

    return () => clearTimeout(timer);
  }, [data, animated]);

  const colors = [
    '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#14b8a6', '#ef4444',
  ];

  let cumulativePercent = 0;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <svg width={size} height={size} viewBox="0 0 160 160">
        {data.map((item, index) => {
          const percent = total > 0 ? (animatedValues[index] / total) * 100 : 0;
          const offset = (cumulativePercent / 100) * circumference;
          cumulativePercent += percent;

          return (
            <circle
              key={index}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={item.color || colors[index % colors.length]}
              strokeWidth="20"
              strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
              strokeDashoffset={-offset}
              className="transition-all duration-1000 ease-out"
              transform="rotate(-90 80 80)"
            />
          );
        })}
        <text x="80" y="75" textAnchor="middle" className="fill-[var(--text-primary)] text-2xl font-black">
          {total}
        </text>
        <text x="80" y="95" textAnchor="middle" className="fill-[var(--text-secondary)] text-xs font-bold">
          Total
        </text>
      </svg>
      <div className="flex flex-wrap gap-3 justify-center">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color || colors[index % colors.length] }}
            />
            <span className="text-xs font-bold text-[var(--text-secondary)]">
              {item.label} ({item.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
