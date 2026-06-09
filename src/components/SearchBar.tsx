import { useState } from 'react';
import { Search, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
  recentSearches?: string[];
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  className,
  recentSearches = []
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showRecent, setShowRecent] = useState(false);

  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300",
        "bg-[var(--bg-card)] backdrop-blur-xl",
        isFocused
          ? "border-blue-500 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20"
          : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
      )}>
        <Search className={cn(
          "w-4 h-4 flex-shrink-0 transition-colors duration-300",
          isFocused ? "text-blue-500" : "text-[var(--text-secondary)]"
        )} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (recentSearches.length) setShowRecent(true);
          }}
          onBlur={() => {
            setIsFocused(false);
            setTimeout(() => setShowRecent(false), 200);
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
        />
        {value && (
          <button
            onClick={handleClear}
            className="p-1 rounded-lg hover:bg-[var(--bg-hover)] transition-all hover:scale-110 active:scale-95"
          >
            <X className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          </button>
        )}
      </div>

      {showRecent && recentSearches.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl shadow-2xl z-50 animate-scale-in overflow-hidden backdrop-blur-xl">
          <div className="px-4 py-2 border-b border-[var(--border-primary)] flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Recent Searches</span>
          </div>
          {recentSearches.slice(0, 5).map((search, index) => (
            <button
              key={index}
              onClick={() => {
                onChange(search);
                setShowRecent(false);
              }}
              className="w-full px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left flex items-center gap-3"
            >
              <Search className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              {search}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
