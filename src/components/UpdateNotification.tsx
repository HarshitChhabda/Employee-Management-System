import { useState, useEffect, useCallback } from 'react';
import { Download, X, RefreshCcw, Check, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; info: UpdateInfo }
  | { status: 'downloading'; progress: DownloadProgress }
  | { status: 'downloaded'; info: UpdateInfo }
  | { status: 'not-available' }
  | { status: 'error'; message: string };

export const UpdateNotification = () => {
  const { language } = useLanguage();
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' });
  const [dismissed, setDismissed] = useState(false);

  const handleCheck = useCallback(async () => {
    if (!window.electronAPI?.updater) return;
    setUpdateState({ status: 'checking' });
    await window.electronAPI.updater.check();
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.updater) return;
    const api = window.electronAPI.updater;

    const removeCheck = api.onCheck(() => {
      setUpdateState({ status: 'checking' });
    });

    const removeAvailable = api.onAvailable((data: UpdateInfo) => {
      setUpdateState({ status: 'available', info: data });
      setDismissed(false);
    });

    const removeNotAvailable = api.onNotAvailable(() => {
      setUpdateState({ status: 'not-available' });
    });

    const removeError = api.onError((message: string) => {
      setUpdateState({ status: 'error', message });
    });

    const removeProgress = api.onDownloadProgress((data: DownloadProgress) => {
      setUpdateState({ status: 'downloading', progress: data });
    });

    const removeDownloaded = api.onDownloaded((data: UpdateInfo) => {
      setUpdateState({ status: 'downloaded', info: data });
    });

    return () => {
      removeCheck();
      removeAvailable();
      removeNotAvailable();
      removeError();
      removeProgress();
      removeDownloaded();
    };
  }, []);

  const handleDownload = async () => {
    if (!window.electronAPI?.updater) return;
    await window.electronAPI.updater.download();
  };

  const handleInstall = async () => {
    if (!window.electronAPI?.updater) return;
    await window.electronAPI.updater.install();
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (dismissed || updateState.status === 'idle' || updateState.status === 'not-available') {
    return null;
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed bottom-6 right-6 z-[3000] animate-fade-in">
      {/* Checking State */}
      {updateState.status === 'checking' && (
        <div className="px-5 py-3.5 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-2xl shadow-black/20 flex items-center gap-3 min-w-[280px]">
          <RefreshCcw className="w-4 h-4 text-blue-500 animate-spin" />
          <span className="text-xs font-bold text-[var(--text-primary)]">
            {language === 'hi' ? 'अपडेट जांच रहे हैं...' : 'Checking for updates...'}
          </span>
        </div>
      )}

      {/* Update Available */}
      {updateState.status === 'available' && (
        <div className="px-5 py-4 bg-[var(--bg-card)] border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-500/10 min-w-[320px] max-w-[400px]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Download className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-[var(--text-primary)]">
                  {language === 'hi' ? 'अपडेट उपलब्ध है!' : 'Update Available!'}
                </p>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] font-mono mt-0.5">
                  v{updateState.info.version}
                </p>
                {updateState.info.releaseNotes && (
                  <p className="text-[9px] text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                    {updateState.info.releaseNotes}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2 mt-3.5">
            <button
              onClick={handleDownload}
              className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wide rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Download className="w-3 h-3" />
              {language === 'hi' ? 'डाउनलोड करें' : 'Download'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-wide rounded-xl transition-colors cursor-pointer"
            >
              {language === 'hi' ? 'बाद में' : 'Later'}
            </button>
          </div>
        </div>
      )}

      {/* Downloading */}
      {updateState.status === 'downloading' && (
        <div className="px-5 py-4 bg-[var(--bg-card)] border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-500/10 min-w-[320px] max-w-[400px]">
          <div className="flex items-center gap-3 mb-3">
            <RefreshCcw className="w-4 h-4 text-blue-500 animate-spin" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-[var(--text-primary)]">
                {language === 'hi' ? 'डाउनलोड हो रहा है...' : 'Downloading...'}
              </p>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] font-mono">
                {Math.round(updateState.progress.percent)}% · {formatBytes(updateState.progress.transferred)} / {formatBytes(updateState.progress.total)}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="w-full h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${updateState.progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Downloaded - Ready to Install */}
      {updateState.status === 'downloaded' && (
        <div className="px-5 py-4 bg-[var(--bg-card)] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/10 min-w-[320px] max-w-[400px]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-purple-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-[var(--text-primary)]">
                  {language === 'hi' ? 'अपडेट तैयार है!' : 'Update Ready!'}
                </p>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] font-mono mt-0.5">
                  v{updateState.info.version} · {language === 'hi' ? 'इंस्टॉल के लिए तैयार' : 'Ready to install'}
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2 mt-3.5">
            <button
              onClick={handleInstall}
              className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black uppercase tracking-wide rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-3 h-3" />
              {language === 'hi' ? 'इंस्टॉल और रीस्टार्ट' : 'Install & Restart'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-wide rounded-xl transition-colors cursor-pointer"
            >
              {language === 'hi' ? 'बाद में' : 'Later'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {updateState.status === 'error' && (
        <div className="px-5 py-4 bg-[var(--bg-card)] border border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/10 min-w-[280px] max-w-[400px]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-[var(--text-primary)]">
                  {language === 'hi' ? 'अपडेट में समस्या' : 'Update Error'}
                </p>
                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                  {updateState.message}
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCheck}
              className="flex-1 px-3 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-[10px] font-black uppercase tracking-wide rounded-xl transition-colors cursor-pointer"
            >
              {language === 'hi' ? 'पुनः प्रयास करें' : 'Retry'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-wide rounded-xl transition-colors cursor-pointer"
            >
              {language === 'hi' ? 'बंद करें' : 'Dismiss'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
