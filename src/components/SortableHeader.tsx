import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
  className?: string;
}

export default function SortableHeader({ label, sortKey, currentSort, onSort, className }: SortableHeaderProps) {
  const isActive = currentSort?.key === sortKey;
  const isAsc = currentSort?.direction === 'asc';

  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        "flex items-center gap-2 group transition-all duration-300",
        "hover:text-[var(--accent-blue)]",
        isActive && "text-[var(--accent-blue)]",
        className
      )}
    >
      <span className="font-bold text-xs uppercase tracking-wider">{label}</span>
      <div className="flex flex-col">
        <ArrowUp className={cn(
          "w-3 h-3 -mb-1 transition-all duration-300",
          isActive && isAsc ? "text-[var(--accent-blue)] opacity-100" : "opacity-30 group-hover:opacity-60"
        )} />
        <ArrowDown className={cn(
          "w-3 h-3 transition-all duration-300",
          isActive && !isAsc ? "text-[var(--accent-blue)] opacity-100" : "opacity-30 group-hover:opacity-60"
        )} />
      </div>
    </button>
  );
}

export function useSort<T>(data: T[], defaultSort?: { key: keyof T; direction: 'asc' | 'desc' }) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: 'asc' | 'desc' } | null>(
    defaultSort || null
  );

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return sorted;
  }, [data, sortConfig]);

  const handleSort = (key: keyof T) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' 
          ? { key, direction: 'desc' } 
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  return { sortedData: sortedData || data, sortConfig, handleSort };
}
