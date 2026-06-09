import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showPages?: boolean;
}

export default function Pagination({ currentPage, totalPages, onPageChange, className, showPages = true }: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="text-sm text-[var(--text-secondary)] font-bold">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300",
            "border border-[var(--border-primary)]",
            currentPage === 1
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-[var(--border-secondary)] hover:shadow-md hover:-translate-y-0.5"
          )}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Previous
        </button>

        {showPages && (
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => (
              typeof page === 'number' ? (
                <button
                  key={index}
                  onClick={() => onPageChange(page)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-xs font-bold transition-all duration-300",
                    currentPage === page
                      ? "bg-blue-500 text-white shadow-md"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {page}
                </button>
              ) : (
                <span key={index} className="px-2 text-[var(--text-secondary)] text-xs">
                  {page}
                </span>
              )
            ))}
          </div>
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300",
            "border border-[var(--border-primary)]",
            currentPage === totalPages
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-[var(--border-secondary)] hover:shadow-md hover:-translate-y-0.5"
          )}
        >
          Next
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
