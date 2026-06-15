import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from '@/core-ui/navigation/Sidebar';
import { Navbar } from '@/core-ui/navigation/Navbar';
import { useConnectivity } from '@/lib/ConnectivityContext';
import { UpdateNotification } from '@/components/UpdateNotification';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isOnline } = useConnectivity();

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) closeSidebar();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, closeSidebar]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)] font-sans selection:bg-[var(--accent-blue)]/30 selection:text-[var(--text-primary)] relative">
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[var(--accent-blue)] focus:text-white focus:rounded-xl focus:font-bold focus:text-xs focus:shadow-lg"
      >
        Skip to main content
      </a>
      {/* Enhanced Background Decorative Ambient Mesh Spheres */}
      <div className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full bg-[var(--accent-blue)]/10 blur-[150px] pointer-events-none z-0 animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute bottom-[-150px] left-[10%] w-[500px] h-[500px] rounded-full bg-[var(--accent-purple)]/5 blur-[120px] pointer-events-none z-0 animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
      <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full bg-[var(--accent-green)]/5 blur-[100px] pointer-events-none z-0 animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />

      {/* Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Drawer */}
      <div className={`fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar collapsed={false} onToggle={closeSidebar} />
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0 relative z-10" onClick={closeSidebar}>
        <Navbar onMenuToggle={toggleSidebar} />
        
        <main id="main-content" className="flex-grow overflow-auto custom-scrollbar">
          <div className="h-full animate-fade-in">
            {children}
          </div>
        </main>

        {/* Global Connectivity Strip (if offline) */}
        {!isOnline && (
          <div 
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-[var(--accent-red)] text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-2xl shadow-red-500/20 z-[2000] flex items-center gap-3 border border-red-400/20 animate-fade-in"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            Operational Continuity: Offline Sync Active
          </div>
        )}

        {/* Auto-Update Notification */}
        <UpdateNotification />
      </div>
    </div>
  );
};
