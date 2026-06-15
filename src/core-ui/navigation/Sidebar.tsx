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
  Building2,
  UserCircle2
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
  if (session.display_name) return session.display_name;
  
  if (session.username === 'branch' && session.role === 'ROLE_BRANCH') return 'Shreemahaveerji';
  if (session.username === 'ho' && session.role === 'ROLE_HO') return 'Jaipur Office';
  if (session.username === 'admin' && session.role === 'ROLE_SUPER') return 'Super Admin';
  
  return session.username;
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
  const { session } = useAuthStore();
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);
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

    return () => {
      clearInterval(cloudInterval);
    };
  }, [session]);

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
      </div>
    </div>
  );
};
