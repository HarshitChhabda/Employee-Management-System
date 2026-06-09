import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check, ExternalLink as ExternalLinkIcon } from 'lucide-react';

interface CopyToClipboardProps {
  text: string;
  className?: string;
  children?: React.ReactNode;
}

export function CopyToClipboard({ text, className, children }: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95",
        className
      )}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {children || (
        <>
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
          )}
        </>
      )}
    </button>
  );
}

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, position = 'top', className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={cn(
            "absolute z-50 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-xl animate-fade-in whitespace-nowrap",
            positionClasses[position],
            className
          )}
        >
          <p className="text-xs font-bold text-[var(--text-primary)]">{content}</p>
          <div className={cn(
            "absolute w-2 h-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rotate-45",
            position === 'top' && "bottom-[-5px] left-1/2 -translate-x-1/2 border-t-0 border-l-0",
            position === 'bottom' && "top-[-5px] left-1/2 -translate-x-1/2 border-b-0 border-r-0",
            position === 'left' && "right-[-5px] top-1/2 -translate-y-1/2 border-l-0 border-b-0",
            position === 'right' && "left-[-5px] top-1/2 -translate-y-1/2 border-r-0 border-t-0"
          )} />
        </div>
      )}
    </div>
  );
}

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function ExternalLink({ href, children, className }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex items-center gap-1.5 group", className)}
    >
      {children}
      <ExternalLinkIcon className="w-3.5 h-3.5 text-[var(--text-secondary)] group-hover:text-blue-500 transition-colors" />
    </a>
  );
}
