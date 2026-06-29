import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Navigate, useLocation } from 'react-router-dom';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import { Shield, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, isAuthenticated, isLoading, checkSession } = useAuthStore();
  const location = useLocation();
  const [pageAccess, setPageAccess] = useState<{ can_read: boolean; loaded: boolean }>({ can_read: true, loaded: false });

  useEffect(() => {
    // Attempt DPAPI session decryption on startup
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    const checkAccess = async () => {
      if (!session || !window.electronAPI) {
        setPageAccess({ can_read: true, loaded: true });
        return;
      }
      // Super Admin can access everything
      if (session.role === 'ROLE_SUPER') {
        setPageAccess({ can_read: true, loaded: true });
        return;
      }
      try {
        const result = await window.electronAPI.invoke('api:permissions', 'check', {
          page_path: location.pathname
        }, session) as { can_read: boolean };
        setPageAccess({ can_read: result.can_read, loaded: true });
      } catch (e) {
        setPageAccess({ can_read: false, loaded: true });
      }
    };
    checkAccess();
  }, [session, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#090d16] text-white font-sans">
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <Shield className="w-8 h-8 text-blue-500 absolute animate-pulse" />
        </div>
        <h2 className="text-lg font-black tracking-tight mt-6 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent animate-pulse">
          HRMS Pro Max
        </h2>
        <p className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase mt-1.5">
          Loading Encrypted Security Session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !session) {
    return <Login />;
  }

  if (pageAccess.loaded && !pageAccess.can_read) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#090d16] text-white font-sans p-8">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black tracking-tight mb-2">Access Denied</h2>
        <p className="text-sm text-slate-400 font-bold text-center max-w-md">
          You do not have permission to access this page. Please contact your Super Admin.
        </p>
        <button
          onClick={() => window.location.hash = '#/'}
          className="mt-6 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
