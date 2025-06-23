import { ipcMain, dialog, BrowserWindow } from 'electron';
import { getDeviceInfo } from '../services/deviceService';
import { FileWatcherService } from '../services/fileWatcher';

export function setupIpcHandlers(mainWindow: BrowserWindow): FileWatcherService {
  const fileWatcherService = new FileWatcherService(mainWindow);

  // Device handlers
  ipcMain.handle('device:getInfo', () => {
    return getDeviceInfo();
  });

  // File watcher handlers
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const directoryPath = result.filePaths[0];
      return await fileWatcherService.startWatching(directoryPath);
    }
    
    return null;
  });

  ipcMain.handle('watcher:stop', async () => {
    await fileWatcherService.stopWatching();
  });

  return fileWatcherService;
} 