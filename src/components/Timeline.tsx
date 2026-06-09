import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Calendar, Clock } from 'lucide-react';

interface TimelineEventProps {
  id?: string;
  date: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  iconColor?: string;
  children?: ReactNode;
}

export function TimelineEvent({ title, date, icon, iconColor, children }: TimelineEventProps) {
  return (
    <div className="relative flex gap-4 group">
      <div className={cn(
        "relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300",
        iconColor || "bg-blue-500/10 border-blue-500/30 text-blue-500"
      )}>
        {icon || <Calendar className="w-4 h-4" />}
      </div>
      <div className="flex-1 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:border-[var(--border-secondary)] -translate-x-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">{title}</h4>
            {children}
            {date && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mt-2 flex-shrink-0">
                <Clock className="w-3 h-3" />
                {date}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TimelineDataEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  color?: string;
}

interface TimelineProps {
  events?: TimelineDataEvent[];
  className?: string;
  children?: ReactNode;
}

export default function Timeline({ events, className, children }: TimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (events) {
    return (
      <div className={cn("relative space-y-6", className)}>
        {events.map((event, index) => (
          <div
            key={event.id}
            className="relative flex gap-4 group"
            onMouseEnter={() => setHoveredId(event.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {index < events.length - 1 && (
              <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-[var(--border-primary)] group-hover:bg-[var(--border-secondary)] transition-colors" />
            )}
            
            <div className={cn(
              "relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300",
              hoveredId === event.id ? "scale-110 shadow-lg" : "",
              event.color || "bg-blue-500/10 border-blue-500/30 text-blue-500"
            )}>
              {event.icon || <Calendar className="w-4 h-4" />}
            </div>

            <div className={cn(
              "flex-1 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4 transition-all duration-300",
              hoveredId === event.id ? "shadow-lg border-[var(--border-secondary)] -translate-x-1" : ""
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">{event.title}</h4>
                  {event.description && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{event.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("relative space-y-6", className)}>
      {children}
    </div>
  );
}
