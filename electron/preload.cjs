const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
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
});
