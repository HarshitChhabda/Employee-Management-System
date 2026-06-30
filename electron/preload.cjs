const { contextBridge, ipcRenderer } = require('electron');

// ALLOWLIST: Only these IPC channels are allowed from renderer
const ALLOWED_CHANNELS = [
  'api:employees', 'api:attendance', 'api:letters', 'api:resigned',
  'api:pl-records', 'api:masters', 'api:tenure-renewals', 'api:leave-balances',
  'api:payroll-summary', 'api:employee-history', 'api:dashboard',
  'api:permissions', 'api:auth:login', 'api:auth:logout',
  'api:sync:save-config', 'api:sync:get-config', 'api:sync:pull', 'api:sync:push', 'api:sync:status',
  'api:backup:create', 'api:backup:list', 'api:backup:restore', 'api:backup:folder', 'api:backup:export', 'api:backup:import',
  'api:update:list', 'api:update:check', 'api:update:scan-pendrive', 'api:update:register', 'api:update:install',
  'api:nuke-database',
  'dialog:select-photo', 'dialog:save-file', 'dialog:open-file',
  'api:updater:check', 'api:updater:download', 'api:updater:install', 'api:updater:status',
  'api:update-manager:snapshot', 'api:update-manager:snapshots', 'api:update-manager:restore',
  'api:update-manager:integrity', 'api:update-manager:safe-update', 'api:update-manager:post-update',
  'api:update-manager:recovery', 'api:update-manager:logs',
];

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => {
    if (!ALLOWED_CHANNELS.includes(channel)) {
      console.error(`[SECURITY] Blocked IPC call to unauthorized channel: ${channel}`);
      return Promise.reject(new Error('Unauthorized channel'));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  selectPhoto: () => ipcRenderer.invoke('dialog:select-photo'),

  // Auto Updater API
  updater: {
    check: () => ipcRenderer.invoke('api:updater:check'),
    download: () => ipcRenderer.invoke('api:updater:download'),
    install: () => ipcRenderer.invoke('api:updater:install'),
    getStatus: () => ipcRenderer.invoke('api:updater:status'),

    onCheck: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('update:checking', handler);
      return () => ipcRenderer.removeListener('update:checking', handler);
    },
    onAvailable: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('update:available', handler);
      return () => ipcRenderer.removeListener('update:available', handler);
    },
    onNotAvailable: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('update:not-available', handler);
      return () => ipcRenderer.removeListener('update:not-available', handler);
    },
    onError: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('update:error', handler);
      return () => ipcRenderer.removeListener('update:error', handler);
    },
    onDownloadProgress: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('update:download-progress', handler);
      return () => ipcRenderer.removeListener('update:download-progress', handler);
    },
    onDownloaded: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('update:downloaded', handler);
      return () => ipcRenderer.removeListener('update:downloaded', handler);
    },
    onRecoverySuccess: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('update:recovery-success', handler);
      return () => ipcRenderer.removeListener('update:recovery-success', handler);
    },
  },

  // Update Manager API (backup + recovery)
  updateManager: {
    createSnapshot: () => ipcRenderer.invoke('api:update-manager:snapshot'),
    listSnapshots: () => ipcRenderer.invoke('api:update-manager:snapshots'),
    restoreSnapshot: (name) => ipcRenderer.invoke('api:update-manager:restore', name),
    checkIntegrity: () => ipcRenderer.invoke('api:update-manager:integrity'),
    safeUpdate: () => ipcRenderer.invoke('api:update-manager:safe-update'),
    postUpdate: () => ipcRenderer.invoke('api:update-manager:post-update'),
    recovery: () => ipcRenderer.invoke('api:update-manager:recovery'),
    getLogs: () => ipcRenderer.invoke('api:update-manager:logs'),
  },

  // Screen info for responsive layout
  onScreenInfo: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('screen:info', handler);
    return () => ipcRenderer.removeListener('screen:info', handler);
  },
});
