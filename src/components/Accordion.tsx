import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface AccordionProps {
  items: AccordionItem[];
  defaultOpen?: string[];
  allowMultiple?: boolean;
  className?: string;
}

interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string;
}

export default function Accordion({ items, defaultOpen = [], allowMultiple = false, className }: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>(defaultOpen);

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenItems(prev => 
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
    } else {
      setOpenItems(prev => 
        prev.includes(id) ? [] : [id]
      );
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => {
        const isOpen = openItems.includes(item.id);
        return (
          <div
            key={item.id}
            className={cn(
              "bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden transition-all duration-300",
              isOpen && "shadow-lg border-[var(--border-secondary)]"
            )}
          >
            <button
              onClick={() => toggleItem(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-5 py-4 text-left transition-colors",
                "hover:bg-[var(--bg-hover)]"
              )}
            >
              <div className="flex items-center gap-3">
                {item.icon && <div className="text-[var(--text-secondary)]">{item.icon}</div>}
                <span className="font-bold text-[var(--text-primary)]">{item.title}</span>
                {item.badge && (
                  <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-bold">
                    {item.badge}
                  </span>
                )}
              </div>
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] transition-transform duration-300" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] transition-transform duration-300" />
              )}
            </button>
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <div className="px-5 pb-4 border-t border-[var(--border-primary)] pt-4">
                {item.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
