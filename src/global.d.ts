interface ElectronAPI {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  selectPhoto?: () => Promise<string | null>;
  updater?: {
    check: () => Promise<unknown>;
    download: () => Promise<unknown>;
    install: () => Promise<unknown>;
    getStatus: () => Promise<{
      success: boolean;
      currentVersion: string;
      updateAvailable: boolean;
      updateVersion?: string;
      error?: string;
    }>;
    onCheck: (callback: (data: boolean) => void) => () => void;
    onAvailable: (callback: (data: { version: string; releaseDate?: string; releaseNotes?: string }) => void) => () => void;
    onNotAvailable: (callback: (data: boolean) => void) => () => void;
    onError: (callback: (data: string) => void) => () => void;
    onDownloadProgress: (callback: (data: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => () => void;
    onDownloaded: (callback: (data: { version: string; releaseDate?: string }) => void) => () => void;
    onRecoverySuccess: (callback: (data: { snapshotName: string }) => void) => () => void;
  };
  updateManager?: {
    createSnapshot: () => Promise<unknown>;
    listSnapshots: () => Promise<unknown>;
    restoreSnapshot: (name: string) => Promise<unknown>;
    checkIntegrity: () => Promise<unknown>;
    safeUpdate: () => Promise<unknown>;
    postUpdate: () => Promise<unknown>;
    recovery: () => Promise<unknown>;
    getLogs: () => Promise<unknown>;
  };
  onScreenInfo?: (callback: (data: { width: number; height: number; scaleFactor: number }) => void) => () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
