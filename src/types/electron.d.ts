import { DeviceInfo } from '@/types/device';

export interface UploadProgress {
  fileName: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface IpcApi {
  getDeviceInfo: () => Promise<DeviceInfo>;
  openDirectory: () => Promise<string | null>;
  stopWatching: () => Promise<void>;
  onFileChange: (callback: (event: { type: string; path: string }) => void) => void;
  onUploadProgress: (callback: (progress: UploadProgress) => void) => void;
}

declare global {
  interface Window {
    api: IpcApi;
  }
} 