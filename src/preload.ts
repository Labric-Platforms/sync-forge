// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    getDeviceInfo: () => ipcRenderer.invoke('device:getInfo'),
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    stopWatching: () => ipcRenderer.invoke('watcher:stop'),
    onFileChange: (callback: (event: { type: string; path: string }) => void) => {
      ipcRenderer.on('file:change', (_, event) => callback(event));
    },
    onUploadProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('upload:progress', (_, progress) => callback(progress));
    }
  }
);
