interface ElectronAPI {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  selectPhoto?: () => Promise<string | null>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
