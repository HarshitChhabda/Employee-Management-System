import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Settings, WifiOff } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useConnectivity } from '@/lib/ConnectivityContext';
import { useAuthStore } from '@/stores/authStore';

export default function SyncStatusBar() {
  const { language } = useLanguage();
  const { isOnline } = useConnectivity();
  const { session } = useAuthStore();
  const [status, setStatus] = useState<{
    configured: boolean;
    connected: boolean;
    pendingCount: number;
    lastSyncAt: string | null;
  }>({
    configured: false,
    connected: false,
    pendingCount: 0,
    lastSyncAt: null
  });

  const [syncing, setSyncing] = useState(false);

  const fetchStatus = async () => {
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.invoke('api:sync:status') as any;
        if (res) {
          setStatus(res);
        }
      } catch (e) {
        console.error('Failed to fetch sync status:', e);
      }
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [isOnline]);

  const handleManualSync = async () => {
    if (syncing || !session || !isOnline) return;
    setSyncing(true);
    if (window.electronAPI) {
      try {
        await window.electronAPI.invoke('api:sync:trigger', session);
        await fetchStatus();
      } catch (e) {
        console.error('Failed to trigger sync:', e);
      }
    }
    setSyncing(false);
  };

  const formatLastSync = (isoString: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // No internet - show disabled state
  if (!isOnline) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-500 text-xs font-bold font-sans shadow-sm select-none cursor-not-allowed opacity-60"
        title={language === 'hi' ? 'इंटरनेट कनेक्शन नहीं है - सिंक अक्षम' : 'No internet connection - Sync disabled'}
      >
        <WifiOff size={14} className="text-slate-500" />
        <div className="flex flex-col text-left">
          <span className="text-[9px] font-black leading-none uppercase tracking-wide">No Internet</span>
          <span className="text-[7px] opacity-75 font-mono tracking-wider mt-0.5">सिंक अक्षम</span>
        </div>
      </div>
    );
  }

  if (!status.configured) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs font-bold font-sans shadow-sm select-none"
        title="Supabase credentials not configured / सुपर्बेस कॉन्फ़िगर नहीं है"
      >
        <Settings size={14} className="animate-spin text-slate-400" style={{ animationDuration: '6s' }} />
        <div className="flex flex-col text-left">
          <span className="text-[9px] font-black leading-none uppercase tracking-wide">Not Configured</span>
          <span className="text-[7px] opacity-75 font-mono tracking-wider mt-0.5">अकॉन्फ़िगर</span>
        </div>
      </div>
    );
  }

  if (syncing) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold font-sans shadow-sm select-none"
      >
        <RefreshCw size={14} className="animate-spin" />
        <div className="flex flex-col text-left">
          <span className="text-[9px] font-black leading-none uppercase tracking-wide">Syncing...</span>
          <span className="text-[7px] opacity-75 font-mono tracking-wider mt-0.5">सिंक हो रहा है...</span>
        </div>
      </div>
    );
  }

  if (status.connected) {
    return (
      <button 
        onClick={handleManualSync}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500/25 transition-all text-xs font-bold font-sans shadow-sm cursor-pointer group active:scale-95"
        title={status.lastSyncAt ? `Last Sync: ${formatLastSync(status.lastSyncAt)}` : 'Click to Sync'}
      >
        <div className="relative flex items-center justify-center">
          <Cloud size={14} className="group-hover:scale-110 transition-transform" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[9px] font-black leading-none uppercase tracking-wide flex items-center gap-1">
            <span>Synced</span>
            {status.lastSyncAt && (
              <span className="text-[8px] font-mono font-normal opacity-70">
                ({formatLastSync(status.lastSyncAt)})
              </span>
            )}
          </span>
          <span className="text-[7px] opacity-75 font-mono tracking-wider mt-0.5">सिंक पूर्ण</span>
        </div>
      </button>
    );
  }

  // Online but Supabase unreachable - clickable to retry
  return (
    <button 
      onClick={handleManualSync}
      className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/25 transition-all text-xs font-bold font-sans shadow-sm cursor-pointer group active:scale-95"
      title={`${status.pendingCount} pending items in queue. Click to retry sync.`}
    >
      <div className="relative flex items-center justify-center">
        <CloudOff size={14} className="group-hover:scale-110 transition-transform" />
        {status.pendingCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 px-1 bg-red-500 text-white rounded-full text-[7px] font-black font-mono">
            {status.pendingCount}
          </span>
        )}
      </div>
      <div className="flex flex-col text-left">
        <span className="text-[9px] font-black leading-none uppercase tracking-wide flex items-center gap-1">
          <span>Offline</span>
          {status.pendingCount > 0 && (
            <span className="text-[8px] font-mono bg-red-500/20 px-1 rounded">
              {status.pendingCount} Pending
            </span>
          )}
        </span>
        <span className="text-[7px] opacity-75 font-mono tracking-wider mt-0.5">
          ऑफ़लाइन ({status.pendingCount} लंबित)
        </span>
      </div>
    </button>
  );
}
