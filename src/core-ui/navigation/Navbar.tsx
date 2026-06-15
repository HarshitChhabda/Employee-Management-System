import { Bell, ChevronRight, User, Settings, LogOut, Command, Search, Menu, AlertTriangle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import SyncStatusBar from '@/components/SyncStatusBar';
import { useAuthStore } from '@/stores/authStore';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

function getUserDisplayName(session: any) {
  if (!session) return '';
  if (session.display_name) return session.display_name;
  
  if (session.username === 'branch' && session.role === 'ROLE_BRANCH') return 'Shreemahaveerji';
  if (session.username === 'ho' && session.role === 'ROLE_HO') return 'Jaipur Office';
  if (session.username === 'admin' && session.role === 'ROLE_SUPER') return 'Super Admin';
  
  return session.username;
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

export const Navbar = ({ onMenuToggle }: { onMenuToggle?: () => void }) => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
    <>
    <header className="mx-6 mt-4 px-5 bg-[var(--bg-card)]/80 backdrop-blur-2xl border border-[var(--border-primary)] rounded-2xl shadow-sm flex items-center justify-between sticky top-4 z-40 h-[56px] min-h-[56px] transition-all duration-300 hover:shadow-lg hover:border-[var(--border-secondary)]">
      {/* Left: Hamburger + Breadcrumbs */}
      <div className="flex items-center flex-grow min-w-0 mr-4">
        {onMenuToggle && (
          <button
            onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
            className="mr-3 p-2 rounded-xl hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex-shrink-0"
            aria-label="Toggle menu"
          >
            <Menu size={18} />
          </button>
        )}
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

          {/* User Profile Dropdown */}
          {session && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<div className="flex items-center gap-2.5 pl-1 cursor-pointer hover:opacity-80 transition-opacity" />}>
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
                      "w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-black text-[10px] shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all",
                      avatarGradient
                    )}
                  >
                    {userInitials}
                  </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-sans">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{userDisplayName}</span>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                        {session.role === 'ROLE_BRANCH' ? (language === 'hi' ? 'ब्रांच एडमिन' : 'Branch Admin') : 
                         session.role === 'ROLE_HO' ? (language === 'hi' ? 'हेड ऑफिस एडमिन' : 'HO Admin') : 
                         (language === 'hi' ? 'सुपर एडमिन' : 'Super Admin')}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer gap-2 font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Settings size={14} />
                  {language === 'hi' ? 'सेटिंग्स' : 'Settings'}
                </DropdownMenuItem>
                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                <DropdownMenuItem onClick={() => setShowLogoutConfirm(true)} className="cursor-pointer gap-2 font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                  <LogOut size={14} />
                  {language === 'hi' ? 'लॉगआउट' : 'Logout'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
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
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logout();
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-red-500/15 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <LogOut size={12} />
                {language === 'hi' ? 'लॉगआउट' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
