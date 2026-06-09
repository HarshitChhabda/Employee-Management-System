import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserSession {
  username: string;
  display_name?: string;
  role: 'ROLE_BRANCH' | 'ROLE_HO' | 'ROLE_SUPER';
  entity: 'BRANCH' | 'HO' | 'ALL';
  expiresAt: string;
  lastActivity?: string;
}

interface AuthState {
  session: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isLocked: boolean;
  lockRemainingMinutes: number;
  checkSession: () => Promise<void>;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; locked?: boolean; remainingMinutes?: number }>;
  logout: () => Promise<void>;
  setError: (error: string | null) => void;
}

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

function resetInactivityTimer(logoutFn: () => Promise<void>) {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    logoutFn();
  }, INACTIVITY_TIMEOUT_MS);
}

function clearInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

function setupActivityListeners(logoutFn: () => Promise<void>) {
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
  const handler = () => resetInactivityTimer(logoutFn);
  events.forEach(event => window.addEventListener(event, handler, { passive: true }));
  return () => {
    events.forEach(event => window.removeEventListener(event, handler));
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      isLocked: false,
      lockRemainingMinutes: 0,

      checkSession: async () => {
        set({ isLoading: true });
        try {
          // @ts-ignore
          if (window.electronAPI) {
            // @ts-ignore
            const res = await window.electronAPI.invoke('api:auth:check-session') as any;
            if (res && res.success && res.session) {
              set({
                session: res.session,
                isAuthenticated: true,
                isLoading: false,
                error: null,
                isLocked: false,
                lockRemainingMinutes: 0
              });
              const logout = get().logout;
              resetInactivityTimer(logout);
              setupActivityListeners(logout);
              return;
            }
          }
        } catch (e: any) {
          console.error('Failed to auto-check session:', e);
        }
        set({ session: null, isAuthenticated: false, isLoading: false });
      },

      login: async (username, password) => {
        set({ isLoading: true, error: null, isLocked: false, lockRemainingMinutes: 0 });
        try {
          // @ts-ignore
          if (window.electronAPI) {
            // @ts-ignore
            const res = await window.electronAPI.invoke('api:auth:login', { username, password }) as any;
            if (res && res.success && res.session) {
              set({
                session: res.session,
                isAuthenticated: true,
                isLoading: false,
                error: null,
                isLocked: false,
                lockRemainingMinutes: 0
              });
              const logout = get().logout;
              resetInactivityTimer(logout);
              setupActivityListeners(logout);
              return { success: true };
            } else {
              const errMessage = res?.error || 'Incorrect credentials';
              set({ 
                error: errMessage, 
                isLoading: false, 
                isAuthenticated: false,
                isLocked: res?.locked || false,
                lockRemainingMinutes: res?.remainingMinutes || 0
              });
              return { success: false, error: errMessage, locked: res?.locked, remainingMinutes: res?.remainingMinutes };
            }
          } else {
            // Web environment mock login
            if (username === 'admin' && password === '7014') {
              const mockSession: UserSession = {
                username: 'admin',
                display_name: 'Super Admin',
                role: 'ROLE_SUPER',
                entity: 'ALL',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                lastActivity: new Date().toISOString()
              };
              set({ session: mockSession, isAuthenticated: true, isLoading: false, error: null });
              return { success: true };
            }
            throw new Error('Invalid credentials');
          }
        } catch (e: any) {
          const errMsg = e.message || 'Login failed';
          set({ error: errMsg, isLoading: false, isAuthenticated: false });
          return { success: false, error: errMsg };
        }
      },

      logout: async () => {
        clearInactivityTimer();
        set({ isLoading: true });
        try {
          // @ts-ignore
          if (window.electronAPI) {
            // @ts-ignore
            await window.electronAPI.invoke('api:session:clear');
          }
        } catch (e) {
          console.error('Failed to clear native session file:', e);
        }
        set({ session: null, isAuthenticated: false, isLoading: false, error: null, isLocked: false, lockRemainingMinutes: 0 });
        localStorage.removeItem('auth-storage');
      },

      setError: (error) => set({ error })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      })
    }
  )
);

export { clearInactivityTimer };
