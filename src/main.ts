import { app, BrowserWindow } from 'electron';
import { updateElectronApp } from 'update-electron-app';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { v4 as uuidv4 } from 'uuid';
import { machineIdSync } from 'node-machine-id';
import crypto from 'crypto';
import fs from 'fs';

updateElectronApp();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Additional imports
import { ipcMain, dialog } from 'electron';
// import { fileURLToPath } from 'url';
import chokidar, { FSWatcher } from 'chokidar';
import os from 'os';

// Define __dirname for ESM if needed
// const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Global variables for filesystem watcher
let watcher: FSWatcher | null = null;
let watchedDirectory: string | null = null;

// Device ID functions
function getDeviceId(): string {
  const userDataPath = app.getPath('userData');
  const idFilePath = path.join(userDataPath, 'device_id.txt');

  if (fs.existsSync(idFilePath)) {
    return fs.readFileSync(idFilePath, 'utf8');
  } else {
    const newId = uuidv4();
    fs.writeFileSync(idFilePath, newId);
    return newId;
  }
}

function getDeviceFingerprint(): string {
  const machineId = machineIdSync(true);
  return crypto.createHash('sha256').update(machineId).digest('hex');
}

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

  // Setup Content Security Policy (CSP) and CORS handling
  const isDev = process.env.NODE_ENV === 'development';
  
  // Handle CORS preflight requests
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['http://localhost:3000/*'] },
    (details, callback) => {
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          'Origin': 'app://.',
        }
      });
    }
  );

  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: ['http://localhost:3000/*'] },
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'access-control-allow-origin': ['app://.'],
          'access-control-allow-methods': ['GET, POST, OPTIONS'],
          'access-control-allow-headers': ['Content-Type'],
        }
      });
    }
  );

  // Setup CSP
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? "default-src 'self' http://localhost:3000; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:3000"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:3000";
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
    const deviceInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpus: os.cpus().length,
      total_memory: Math.round(os.totalmem() / (1024 * 1024 * 1024)), // in GB
      type: os.type(),
      device_id: getDeviceId(),
      device_fingerprint: getDeviceFingerprint()
    }
    console.log('Device info', deviceInfo);
    return deviceInfo;
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
