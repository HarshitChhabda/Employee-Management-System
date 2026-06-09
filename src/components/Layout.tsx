import { useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  FileText, 
  UserX,
  Menu,
  X,
  Search,
  LogOut,
  Table2
} from 'lucide-react';
import { hindiLabels } from '../lib/hindiLabels';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSidebarEnter = () => {
    if (window.innerWidth >= 1024) {
      if (hideTimer.current !== null) clearTimeout(hideTimer.current);
      setIsExpanded(true);
    }
  };

  const handleSidebarLeave = () => {
    if (window.innerWidth >= 1024) {
      hideTimer.current = setTimeout(() => setIsExpanded(false), 300);
    }
  };

  const showLabels = sidebarOpen || isExpanded;

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: hindiLabels.dashboard, labelEn: 'Dashboard' },
    { path: '/employees', icon: Users, label: hindiLabels.employees, labelEn: 'Employees' },
    { path: '/attendance', icon: CalendarCheck, label: hindiLabels.attendance, labelEn: 'Attendance' },
    { path: '/attendance-excel', icon: Table2, label: 'Excel Register / एक्सेल रजिस्टर', labelEn: 'Excel Register' },
    { path: '/letters', icon: FileText, label: hindiLabels.letters, labelEn: 'Letters' },
    { path: '/resigned', icon: UserX, label: hindiLabels.resigned, labelEn: 'Resigned' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        className={`
          fixed lg:relative inset-y-0 left-0 z-50 bg-slate-900 border-r border-slate-800
          transition-all duration-300 ease-in-out
          ${showLabels ? 'w-72' : 'w-16'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-full flex flex-col overflow-hidden">
          {/* Logo */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-center lg:justify-start gap-3 min-h-[72px]">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className={`${showLabels ? 'block' : 'hidden'} min-w-0`}>
              <h1 className="text-lg font-bold text-white leading-tight truncate">{hindiLabels.appName}</h1>
              <p className="text-xs text-slate-400 truncate">{hindiLabels.appSubtitle}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center justify-center lg:justify-start gap-3 px-3 py-3 rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
                title={!showLabels ? item.labelEn : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <div className={`${showLabels ? 'block' : 'hidden'} min-w-0`}>
                  <span className="font-medium block text-xs leading-tight truncate">{item.label}</span>
                  <span className="text-[10px] opacity-70 truncate block">{item.labelEn}</span>
                </div>
              </NavLink>
            ))}
          </nav>

          {/* Bottom Section */}
          <div className={`${showLabels ? 'block' : 'hidden'} p-3 border-t border-slate-800`}>
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 text-center">
                EMS v1.0
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Quick Search */}
            <div className="hidden md:flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">AI Search - </span>
              <span className="text-xs text-slate-500">Name, Code, Date...</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">Admin User</p>
              <p className="text-xs text-slate-400">Jaipur Head Office</p>
            </div>
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}