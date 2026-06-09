import { Bell, ChevronRight, User, Settings, LogOut, Command, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import SyncStatusBar from '@/components/SyncStatusBar';
import { useAuthStore } from '@/stores/authStore';

function getUserDisplayName(session: any) {
  if (!session) return '';
  if (session.role === 'ROLE_BRANCH') return 'Shreemahaveerji';
  if (session.role === 'ROLE_HO') return 'Jaipur Office';
  if (session.role === 'ROLE_SUPER') return 'Super Admin';
  return session.display_name || session.username;
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

export const Navbar = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useAuthStore();

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(p => p);
    const pathMap: Record<string, string> = {
      'employees': 'Personnel Directory',
      'attendance-excel': 'Attendance Ledger',
      'letters': 'Official Archive',
      'resigned': 'Separation History',
      'audit-log': 'System Audit',
      'attendance-report': 'Analytical Report',
      'pl-management': 'Leave Portfolio',
      'settings': 'Organization Masters',
    };
    
    return (
      <div className="flex items-center gap-2 font-sans overflow-hidden select-none text-[var(--text-primary)]">
        <span className="text-[var(--text-secondary)] font-black text-[9px] uppercase tracking-[0.25em] opacity-60">HRMS</span>
        <ChevronRight size={12} className="text-[var(--text-secondary)] opacity-40" />
        <span className="font-black tracking-tight text-nowrap text-xs text-[var(--text-primary)] uppercase">
          {paths.length > 0 ? (pathMap[paths[paths.length - 1]] || paths[paths.length - 1]) : 'Command Center'}
        </span>
      </div>
    );
  };

  const userDisplayName = getUserDisplayName(session);
  const userInitials = getUserInitials(session);
  const avatarGradient = getUserAvatarGradient(session);

  return (
    <header className="mx-6 mt-4 px-5 bg-[var(--bg-card)]/80 backdrop-blur-2xl border border-[var(--border-primary)] rounded-2xl shadow-sm flex items-center justify-between sticky top-4 z-40 h-[56px] min-h-[56px] transition-all duration-300 hover:shadow-lg hover:border-[var(--border-secondary)]">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center flex-grow min-w-0 mr-4">
        {getBreadcrumbs()}
      </div>

      {/* Right: Search + Actions */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {/* Sync Status */}
          <SyncStatusBar />

          {/* Theme Toggle */}
          <ThemeToggle />

          <div className="h-5 w-px bg-[var(--border-primary)]/50 mx-1" />

          {/* User Profile */}
          {session && (
            <div className="flex items-center gap-2.5 pl-1">
              <div className="hidden md:flex flex-col items-end min-w-0">
                <span className="text-[11px] font-bold text-[var(--text-primary)] leading-tight truncate max-w-[120px]">
                  {userDisplayName}
                </span>
                <span className="text-[8px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                  {session.role === 'ROLE_BRANCH' ? (language === 'hi' ? 'ब्रांच' : 'Branch') : 
                   session.role === 'ROLE_HO' ? (language === 'hi' ? 'हेड ऑफिस' : 'HO') : 
                   (language === 'hi' ? 'सुपर' : 'Super')}
                </span>
              </div>
              <div 
                className={cn(
                  "w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-black text-[10px] shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer",
                  avatarGradient
                )}
                title={session.display_name || session.username}
              >
                {userInitials}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
