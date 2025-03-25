import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Additional imports
import { ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'url';
import chokidar, { FSWatcher } from 'chokidar';
import os from 'os';

// Define __dirname for ESM if needed
// const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Global variables for filesystem watcher
let watcher: FSWatcher | null = null;
let watchedDirectory: string | null = null;

// Declare globals provided by your build/environment
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, './assets/icons/icon.png'),
  });

  // Setup Content Security Policy (CSP)
  const isDev = process.env.NODE_ENV === 'development';
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://localhost:*"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL).catch(err => console.error('Failed to load URL:', err));
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
      .catch(err => console.error('Failed to load file:', err));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // IPC handler: Provide device info
  ipcMain.handle('device:getInfo', () => {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)), // in GB
      type: os.type()
    };
  });

  // IPC handler: Open directory dialog and start filesystem watcher
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      // Stop previous watcher if exists
      if (watcher) {
        await watcher.close();
      }
      watchedDirectory = result.filePaths[0];
      watcher = chokidar.watch(watchedDirectory, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true
      });
      // Helper: get relative file path
      const getRelativePath = (fullPath: string): string => path.relative(watchedDirectory as string, fullPath);

      watcher
        .on('add', (filepath: string) => mainWindow.webContents.send('file:change', {
          type: 'add',
          path: getRelativePath(filepath)
        }))
        .on('change', (filepath: string) => mainWindow.webContents.send('file:change', {
          type: 'change',
          path: getRelativePath(filepath)
        }))
        .on('unlink', (filepath: string) => mainWindow.webContents.send('file:change', {
          type: 'delete',
          path: getRelativePath(filepath)
        }));
      return watchedDirectory;
    }
    return null;
  });

  // IPC handler: Stop watching the directory
  ipcMain.handle('watcher:stop', async () => {
    if (watcher) {
      await watcher.close();
      watcher = null;
    }
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Clean up watcher on app quit
app.on('before-quit', async () => {
  if (watcher) {
    await watcher.close();
  }
});
