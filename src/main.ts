import { app, BrowserWindow } from 'electron';
import { updateElectronApp } from 'update-electron-app';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { setupIpcHandlers } from './main/ipc';
import { setupSecurity } from './main/security/csp';
import { FileWatcherService } from './main/services/fileWatcher';

updateElectronApp();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Declare globals provided by your build/environment
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;
let fileWatcherService: FileWatcherService | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, './assets/icons/icon.png'),
  });

  // Setup security and CORS
  setupSecurity(mainWindow);

  // Setup IPC handlers
  fileWatcherService = setupIpcHandlers(mainWindow);

  // Load the app
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
      .catch(err => console.error('Failed to load URL:', err));
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
      .catch(err => console.error('Failed to load file:', err));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
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
  if (fileWatcherService) {
    await fileWatcherService.stopWatching();
  }
});
