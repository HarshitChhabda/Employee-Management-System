import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopProps {
  threshold?: number;
  className?: string;
}

export default function ScrollToTop({ threshold = 300, className }: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > threshold);
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] shadow-xl flex items-center justify-center transition-all duration-300 hover:shadow-2xl hover:border-[var(--border-secondary)] hover:scale-110 active:scale-95 backdrop-blur-xl",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
        className
      )}
      title="Scroll to top"
    >
      <ArrowUp className="w-5 h-5 text-[var(--text-primary)]" />
    </button>
  );
}
