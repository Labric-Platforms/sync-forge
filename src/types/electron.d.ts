export interface IpcApi {
  getDeviceInfo: () => Promise<{
    hostname: string;
    platform: string;
    release: string;
    arch: string;
    cpus: number;
    totalMemory: number;
    type: string;
  }>;
  openDirectory: () => Promise<string | null>;
  stopWatching: () => Promise<void>;
  onFileChange: (callback: (event: { type: string; path: string }) => void) => void;
}

declare global {
  interface Window {
    api: IpcApi;
  }
} 