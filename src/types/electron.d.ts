import { DeviceInfo } from '@/types/device';

export interface IpcApi {
  getDeviceInfo: () => Promise<DeviceInfo>;
  openDirectory: () => Promise<string | null>;
  stopWatching: () => Promise<void>;
  onFileChange: (callback: (event: { type: string; path: string }) => void) => void;
}

declare global {
  interface Window {
    api: IpcApi;
  }
} 