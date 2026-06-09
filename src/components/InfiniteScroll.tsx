import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface InfiniteScrollProps {
  children: React.ReactNode;
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  threshold?: number;
  className?: string;
}

export default function InfiniteScroll({
  children,
  onLoadMore,
  hasMore,
  loading,
  threshold = 200,
  className
}: InfiniteScrollProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleScroll = useCallback(() => {
    if (isLoading || !hasMore || loading) return;

    const scrollable = document.documentElement;
    const scrollTop = scrollable.scrollTop;
    const scrollHeight = scrollable.scrollHeight;
    const clientHeight = scrollable.clientHeight;

    if (scrollTop + clientHeight >= scrollHeight - threshold) {
      setIsLoading(true);
      onLoadMore();
      setTimeout(() => setIsLoading(false), 500);
    }
  }, [hasMore, loading, onLoadMore, threshold]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="flex justify-center items-center py-8 animate-fade-in">
          <div className="w-8 h-8 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!hasMore && (
        <div className="text-center py-4 text-sm text-[var(--text-secondary)] font-bold">
          No more items to load
        </div>
      )}
    </div>
  );
}
