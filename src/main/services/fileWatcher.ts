import { BrowserWindow } from 'electron';
import chokidar from 'chokidar';
import path from 'node:path';

export class FileWatcherService {
  private watcher: any = null;
  private watchedDirectory: string | null = null;
  private mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  async startWatching(directoryPath: string): Promise<string> {
    await this.stopWatching();
    
    this.watchedDirectory = directoryPath;
    this.watcher = chokidar.watch(directoryPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true
    });

    // Send file change events to renderer
    this.watcher
      .on('add', (filepath: string) => this.notifyChange('add', filepath))
      .on('change', (filepath: string) => this.notifyChange('change', filepath))
      .on('unlink', (filepath: string) => this.notifyChange('delete', filepath));

    return directoryPath;
  }

  private notifyChange(type: 'add' | 'change' | 'delete', filepath: string) {
    const relativePath = path.relative(this.watchedDirectory!, filepath);
    this.mainWindow.webContents.send('file:change', {
      type,
      path: relativePath
    });
  }

  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.watchedDirectory = null;
    }
  }

  getWatchedDirectory(): string | null {
    return this.watchedDirectory;
  }

  isWatching(): boolean {
    return this.watcher !== null;
  }
} 