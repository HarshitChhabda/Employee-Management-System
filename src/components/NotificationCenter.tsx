import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Bell, X, Check, AlertCircle, Info } from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  className?: string;
}

export default function NotificationCenter({ notifications, onMarkRead, onClearAll, className }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <Check className="w-4 h-4 text-green-500" />;
      case 'error': return <X className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'bg-green-500/10 border-green-500/20';
      case 'error': return 'bg-red-500/10 border-red-500/20';
      case 'warning': return 'bg-amber-500/10 border-amber-500/20';
      case 'info': return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-blue-500/30 transition-all hover:scale-105 active:scale-95"
      >
        <Bell className="w-5 h-5 text-[var(--text-secondary)]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-2xl z-50 animate-scale-in overflow-hidden backdrop-blur-xl">
            <div className="px-5 py-4 border-b border-[var(--border-primary)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">Notifications</h3>
                <p className="text-xs text-[var(--text-secondary)] font-bold mt-0.5">सूचनाएं</p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={onClearAll}
                  className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Bell className="w-12 h-12 text-[var(--text-secondary)] opacity-30 mb-3" />
                  <p className="text-sm font-bold text-[var(--text-secondary)]">No notifications</p>
                  <p className="text-xs text-[var(--text-secondary)] opacity-75 mt-1">कोई सूचना नहीं</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => onMarkRead(notification.id)}
                    className={cn(
                      "px-5 py-4 border-b border-[var(--border-primary)] cursor-pointer transition-all duration-300 hover:bg-[var(--bg-hover)]",
                      !notification.read && "bg-[var(--bg-tertiary)]/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg border", getBgColor(notification.type))}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)]">{notification.title}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">{notification.message}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] opacity-60 mt-2">
                          {notification.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
