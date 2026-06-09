import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, CalendarCheck, FileText, 
  Settings, Calculator, TrendingUp, Zap 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  labelHi: string;
  icon: React.ElementType;
  color: string;
  route: string;
  shortcut?: string;
}

const quickActions: QuickAction[] = [
  { id: 'dashboard', label: 'Dashboard', labelHi: 'डैशबोर्ड', icon: LayoutDashboard, color: 'blue', route: '#/', shortcut: 'Ctrl+D' },
  { id: 'employees', label: 'Add Employee', labelHi: 'कर्मचारी जोड़ें', icon: Users, color: 'green', route: '#/employees', shortcut: 'Ctrl+E' },
  { id: 'attendance', label: 'Attendance', labelHi: 'उपस्थिति', icon: CalendarCheck, color: 'purple', route: '#/attendance-excel', shortcut: 'Ctrl+A' },
  { id: 'letters', label: 'Letters', labelHi: 'पत्र', icon: FileText, color: 'orange', route: '#/letters', shortcut: 'Ctrl+L' },
  { id: 'reports', label: 'Reports', labelHi: 'रिपोर्ट', icon: TrendingUp, color: 'teal', route: '#/attendance-report', shortcut: 'Ctrl+R' },
  { id: 'payroll', label: 'Payroll', labelHi: 'वेतन', icon: Calculator, color: 'red', route: '#/payroll', shortcut: 'Ctrl+P' },
  { id: 'settings', label: 'Settings', labelHi: 'सेटिंग्स', icon: Settings, color: 'gray', route: '#/settings', shortcut: 'Ctrl+S' },
];

const colorMap: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600 shadow-blue-500/25',
  green: 'from-green-500 to-green-600 shadow-green-500/25',
  purple: 'from-purple-500 to-purple-600 shadow-purple-500/25',
  orange: 'from-orange-500 to-orange-600 shadow-orange-500/25',
  teal: 'from-teal-500 to-teal-600 shadow-teal-500/25',
  red: 'from-red-500 to-red-600 shadow-red-500/25',
  gray: 'from-gray-500 to-gray-600 shadow-gray-500/25',
};

export default function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-2xl shadow-blue-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 animate-pulse-glow"
        title="Quick Actions (Ctrl+K)"
      >
        <Zap className="w-6 h-6" />
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setIsOpen(false)} />
      <div className="fixed bottom-24 right-6 z-50 w-80 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-2xl animate-scale-in overflow-hidden backdrop-blur-xl">
        <div className="px-5 py-4 border-b border-[var(--border-primary)]">
          <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">Quick Actions</h3>
          <p className="text-xs text-[var(--text-secondary)] font-bold mt-0.5">त्वरित क्रियाएं</p>
        </div>
        <div className="p-3 grid grid-cols-1 gap-2 max-h-96 overflow-y-auto custom-scrollbar">
          {quickActions.map((action) => (
            <a
              key={action.id}
              href={action.route}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-300 group hover:scale-[1.02] cursor-pointer"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300",
                colorMap[action.color]
              )}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[var(--text-primary)]">{action.label}</p>
                <p className="text-xs text-[var(--text-secondary)] font-bold">{action.labelHi}</p>
              </div>
              {action.shortcut && (
                <span className="text-[10px] font-mono font-bold text-[var(--text-secondary)] opacity-60 hidden lg:block">
                  {action.shortcut}
                </span>
              )}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
