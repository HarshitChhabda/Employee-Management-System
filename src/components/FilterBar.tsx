import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Filter, X } from 'lucide-react';

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
  className?: string;
}

export function FilterChip({ label, isActive, onClick, count, className }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300",
        "border hover:scale-105 active:scale-95",
        isActive
          ? "bg-blue-500/10 border-blue-500/30 text-blue-500 shadow-md shadow-blue-500/10"
          : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--border-secondary)]",
        className
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn(
          "px-1.5 py-0.5 rounded-md text-[10px] font-mono",
          isActive ? "bg-blue-500/20" : "bg-[var(--bg-tertiary)]"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

interface FilterBarProps {
  filters: {
    id: string;
    label: string;
    count?: number;
  }[];
  activeFilters: string[];
  onFilterChange: (filters: string[]) => void;
  className?: string;
}

export default function FilterBar({ filters, activeFilters, onFilterChange, className }: FilterBarProps) {
  const toggleFilter = (id: string) => {
    if (activeFilters.includes(id)) {
      onFilterChange(activeFilters.filter(f => f !== id));
    } else {
      onFilterChange([...activeFilters, id]);
    }
  };

  const clearAll = () => {
    onFilterChange([]);
  };

  return (
    <div className={cn("flex items-center gap-3 flex-wrap", className)}>
      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
        <Filter className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Filters</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((filter) => (
          <FilterChip
            key={filter.id}
            label={filter.label}
            isActive={activeFilters.includes(filter.id)}
            onClick={() => toggleFilter(filter.id)}
            count={filter.count}
          />
        ))}
      </div>
      {activeFilters.length > 0 && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-red-500 hover:bg-red-500/10 transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <X className="w-3 h-3" />
          Clear All
        </button>
      )}
    </div>
  );
}
