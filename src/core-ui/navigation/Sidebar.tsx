import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  FileText, 
  UserX,
  ClipboardList,
  ShieldCheck,
  Calendar,
  Command,
  Plus,
  Cpu,
  Network,
  Zap,
  Cloud,
  Database,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Settings,
  Calculator,
  LogOut,
  AlertTriangle,
  Building2,
  UserCircle2,
  Package
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useConnectivity } from '@/lib/ConnectivityContext';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/', icon: LayoutDashboard, labelKey: 'common.dashboard' },
      { path: '/employees', icon: Users, labelKey: 'common.employees', showBadge: true },
    ]
  },
  {
    label: 'Attendance',
    items: [
      { path: '/attendance-excel', icon: CalendarCheck, labelKey: 'common.attendanceRegister' },
      { path: '/attendance-report', icon: Calendar, labelKey: 'attendance.reportTitle' },
      { path: '/pl-management', icon: ClipboardList, labelKey: 'common.plManagement' },
      { path: '/payroll', icon: Calculator, labelKey: 'common.payroll' },
    ]
  },
  {
    label: 'Vault',
    items: [
      { path: '/letters', icon: FileText, labelKey: 'common.letters' },
      { path: '/resigned', icon: UserX, labelKey: 'common.resigned' },
      { path: '/audit-log', icon: ShieldCheck, labelKey: 'common.auditLog' },
      { path: '/settings', icon: Settings, labelKey: 'common.settings' },
    ]
  }
];

function getUserDisplayName(session: any) {
  if (!session) return '';
  if (session.role === 'ROLE_BRANCH') return 'Shreemahaveerji';
  if (session.role === 'ROLE_HO') return 'Jaipur Office';
  if (session.role === 'ROLE_SUPER') return 'Super Admin';
  return session.display_name || session.username;
}

function getUserRoleLabel(session: any, language: string) {
  if (!session) return '';
  if (session.role === 'ROLE_BRANCH') return language === 'hi' ? 'ब्रांच एडमिन' : 'Branch Admin';
  if (session.role === 'ROLE_HO') return language === 'hi' ? 'हेड ऑफिस' : 'Head Office';
  if (session.role === 'ROLE_SUPER') return language === 'hi' ? 'सुपर एडमिन' : 'Super Admin';
  return session.role;
}

function getUserInitials(session: any) {
  if (!session) return 'U';
  if (session.role === 'ROLE_BRANCH') return 'SM';
  if (session.role === 'ROLE_HO') return 'HO';
  if (session.role === 'ROLE_SUPER') return 'SA';
  return session.username?.substring(0, 2).toUpperCase() || 'U';
}

function getUserAvatarGradient(session: any) {
  if (!session) return 'from-blue-500 to-purple-600';
  if (session.role === 'ROLE_BRANCH') return 'from-emerald-500 to-teal-600';
  if (session.role === 'ROLE_HO') return 'from-blue-500 to-indigo-600';
  if (session.role === 'ROLE_SUPER') return 'from-purple-500 to-pink-600';
  return 'from-blue-500 to-purple-600';
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const { t, language } = useLanguage();
  const { isOnline } = useConnectivity();
  const { session, logout } = useAuthStore();
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [allowedPages, setAllowedPages] = useState<Set<string> | null>(null);

  useEffect(() => {
    const loadPermissions = async () => {
      if (!window.electronAPI || !session) return;
      try {
        const perms = await window.electronAPI.invoke('api:permissions', 'get', null, session) as any[];
        if (Array.isArray(perms) && perms.length > 0) {
          const accessible = new Set<string>();
          for (const p of perms) {
            if (p.can_read) accessible.add(p.page_path);
          }
          setAllowedPages(accessible);
        } else {
          setAllowedPages(null);
        }
      } catch (e) {
        setAllowedPages(null);
      }
    };
    loadPermissions();
  }, [session]);

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setEmployeeCount(data.length);
    }).catch(() => {});

    const checkCloud = async () => {
      if (window.electronAPI) {
        const res = await window.electronAPI.invoke('api:sync:status') as any;
        setCloudConnected(res && res.connected);
      }
    };
    checkCloud();
    const cloudInterval = setInterval(checkCloud, 15000);

    const checkForUpdates = async () => {
      if (window.electronAPI?.updater) {
        try {
          const res = await window.electronAPI.updater.getStatus() as any;
          if (res && res.updateAvailable) {
            setUpdateAvailable(true);
          }
        } catch (e) { /* ignore */ }
      }
    };
    checkForUpdates();
    const updateInterval = setInterval(checkForUpdates, 120000);

    return () => {
      clearInterval(cloudInterval);
      clearInterval(updateInterval);
    };
  }, [session]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutConfirm(false);
    await logout();
  };

  const filteredNavGroups = navGroups.map(group => {
    const items = group.items.filter(item => {
      if (session?.role === 'ROLE_SUPER') return true;
      if (!allowedPages) return true;
      return allowedPages.has(item.path);
    });
    return { ...group, items };
  }).filter(group => group.items.length > 0);

  const userDisplayName = getUserDisplayName(session);
  const userRoleLabel = getUserRoleLabel(session, language);
  const userInitials = getUserInitials(session);
  const avatarGradient = getUserAvatarGradient(session);

  return (
    <div 
      className={cn(
        "flex flex-col h-full overflow-hidden border-r border-[var(--border-primary)] bg-[var(--bg-card)] backdrop-blur-2xl relative transition-all duration-500 ease-out z-50 shadow-xl",
        collapsed ? "w-[78px]" : "w-[260px]"
      )}
    >
      {/* Ambient Glow */}
      <div className="absolute top-[-50px] left-[-50px] w-[180px] h-[180px] rounded-full bg-blue-500/5 blur-[50px] pointer-events-none z-0" />

      {/* Brand Section */}
      <div className="px-5 py-5 flex items-center gap-3 relative z-10 select-none border-b border-[var(--border-primary)]/50">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all duration-300 cursor-pointer">
            <Cpu size={20} strokeWidth={2.5} />
          </div>
          <div 
            className={cn(
              "absolute -top-1 -right-1 w-3 h-3 border-2 border-[var(--bg-card)] rounded-full transition-all",
              isOnline 
                ? "bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
                : "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            )}
          />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0 transition-all duration-300">
            <span className="font-black tracking-tight text-[var(--text-primary)] uppercase leading-none text-[13px]">HRMS PRO MAX</span>
            <span className="text-[7px] font-bold text-blue-500/80 uppercase tracking-[0.2em] mt-1 font-mono">Enterprise Platform</span>
          </div>
        )}
      </div>

      {/* User Profile Card */}
      {!collapsed && session && (
        <div className="px-4 py-3 border-b border-[var(--border-primary)]/50 bg-gradient-to-r from-[var(--bg-secondary)]/80 to-transparent relative z-10">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-[11px] font-black shadow-md flex-shrink-0 uppercase",
              avatarGradient
            )}>
              {userInitials}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-black text-[12px] text-[var(--text-primary)] truncate leading-tight">
                {userDisplayName}
              </span>
              <span className="text-[8px] font-bold text-blue-500/90 uppercase tracking-wider font-mono mt-0.5">
                {userRoleLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-grow overflow-y-auto custom-scrollbar px-3 py-4 space-y-6 relative z-10">
        {filteredNavGroups.map((group) => (
          <div key={group.label} className="space-y-1.5">
            {!collapsed && (
              <div className="px-3 py-1 text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em] opacity-60 font-mono">
                {group.label}
              </div>
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ease-out group relative font-semibold",
                    isActive 
                      ? "bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white shadow-md shadow-blue-500/10" 
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]",
                    collapsed && "justify-center px-0 h-10 w-10 mx-auto"
                  )}
                  title={collapsed ? t(item.labelKey) : ''}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full" />
                      )}
                      
                      <item.icon 
                        size={17} 
                        strokeWidth={isActive ? 2.5 : 1.8} 
                        className={cn(
                          "relative z-10 transition-all duration-200 flex-shrink-0",
                          isActive ? "text-white" : "group-hover:text-blue-500"
                        )}
                      />
                      {!collapsed && (
                        <span className="relative z-10 flex-grow font-semibold text-[11px] tracking-wide">{t(item.labelKey)}</span>
                      )}
                      {!collapsed && item.showBadge && employeeCount > 0 && (
                        <span className={cn(
                          "relative z-10 px-1.5 py-0.5 rounded-md text-[8px] font-bold tracking-tight font-mono",
                          isActive ? "bg-white/20 text-white" : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        )}>
                          {employeeCount}
                        </span>
                      )}
                      {item.path === '/settings' && updateAvailable && (
                        collapsed ? (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border-2 border-[var(--bg-card)]" />
                        ) : (
                          <span className="relative z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <Package className="w-2.5 h-2.5" />
                            {language === 'hi' ? 'अपडेट' : 'UPDATE'}
                          </span>
                        )
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* System Status Footer */}
      <div className="mt-auto border-t border-[var(--border-primary)]/50 bg-[var(--bg-secondary)]/50 backdrop-blur-md relative z-10">
        {/* Local DB + Cloud Status */}
        <div className={cn("p-3 flex items-center justify-between gap-2", collapsed && "flex-col justify-center px-2 py-3")}>
          <div className={cn("flex items-center gap-2", collapsed && "justify-center w-full")} title="Local SQLite: Connected">
            <div className="relative flex-shrink-0">
              <div className="w-6 h-6 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)]/50 flex items-center justify-center">
                <Database size={11} className="text-emerald-500" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[var(--bg-card)] bg-emerald-500" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[8px] font-bold text-[var(--text-secondary)] uppercase">Local</span>
                <span className="text-[7px] font-mono text-emerald-500 font-bold">Active</span>
              </div>
            )}
          </div>

          {!collapsed && <div className="w-[1px] h-5 bg-[var(--border-primary)]/30" />}

          <div className={cn("flex items-center gap-2", collapsed && "justify-center w-full mt-1")} title={`Cloud: ${cloudConnected ? 'Connected' : 'Offline'}`}>
            <div className="relative flex-shrink-0">
              <div className="w-6 h-6 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)]/50 flex items-center justify-center">
                <Cloud size={11} className={cloudConnected ? "text-blue-500" : "text-slate-500"} />
              </div>
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[var(--bg-card)]",
                cloudConnected ? "bg-blue-500" : "bg-red-500"
              )} />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[8px] font-bold text-[var(--text-secondary)] uppercase">Cloud</span>
                <span className={cn(
                  "text-[7px] font-mono font-bold",
                  cloudConnected ? "text-blue-500" : "text-red-500"
                )}>
                  {cloudConnected ? 'Linked' : 'Offline'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Logout */}
        {!collapsed && session && (
          <div className="px-3 pb-3">
            <button
              onClick={handleLogoutClick}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 text-red-500 hover:text-red-400 transition-all font-semibold text-[10px] uppercase tracking-wider cursor-pointer"
            >
              <LogOut size={12} />
              {language === 'hi' ? 'लॉगआउट' : 'Logout'}
            </button>
          </div>
        )}

        {collapsed && session && (
          <div className="p-2 flex justify-center border-t border-[var(--border-primary)]/30">
            <button
              onClick={handleLogoutClick}
              aria-label="Logout"
              className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 flex items-center justify-center transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute bottom-[120px] -right-2.5 w-5 h-10 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-blue-500 hover:border-blue-500/50 transition-all shadow-lg z-50 group backdrop-blur-md cursor-pointer"
      >
        {collapsed ? <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" /> : <ChevronLeft size={10} className="group-hover:-translate-x-0.5 transition-transform" />}
      </button>

      {/* Logout Modal */}
      {showLogoutConfirm && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-500">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm text-[var(--text-primary)] uppercase tracking-wide">
                  {language === 'hi' ? 'लॉगआउट की पुष्टि करें' : 'Confirm Logout'}
                </h3>
                <p className="text-[8px] font-bold text-[var(--text-secondary)] font-mono uppercase tracking-widest mt-0.5">
                  {language === 'hi' ? 'सत्र समाप्त किया जाएगा' : 'Session will be terminated'}
                </p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-bold mb-6">
              {language === 'hi' 
                ? 'क्या आप वाकई लॉगआउट करना चाहते हैं? आपको पुनः लॉगिन करना होगा।'
                : 'Are you sure you want to logout? You will need to sign in again.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95"
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-red-500/15 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <LogOut size={12} />
                {language === 'hi' ? 'लॉगआउट' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
