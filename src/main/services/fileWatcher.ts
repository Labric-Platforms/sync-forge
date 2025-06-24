import { BrowserWindow } from 'electron';
import chokidar from 'chokidar';
import path from 'node:path';
import { UploadService, UploadProgress } from './uploadService';

export class FileWatcherService {
  private watcher: any = null;
  private watchedDirectory: string | null = null;
  private mainWindow: BrowserWindow;
  private uploadDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly UPLOAD_DEBOUNCE_DELAY = 2000; // 2 second debounce for uploads
  private uploadService: UploadService;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.uploadService = new UploadService();
    
    // Forward upload progress to renderer
    this.uploadService.on('progress', (progress: UploadProgress) => {
      this.mainWindow.webContents.send('upload:progress', progress);
    });
  }

  async startWatching(directoryPath: string): Promise<string> {
    await this.stopWatching();
    
    this.watchedDirectory = directoryPath;
    this.watcher = chokidar.watch(directoryPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    // Send file change events to renderer immediately
    this.watcher
      .on('add', (filepath: string) => this.handleFileChange('add', filepath))
      .on('change', (filepath: string) => this.handleFileChange('change', filepath))
      .on('unlink', (filepath: string) => this.handleFileChange('delete', filepath));

    return directoryPath;
  }

  private handleFileChange(type: 'add' | 'change' | 'delete', filepath: string) {
    // Immediately notify renderer
    this.notifyChange(type, filepath);
    
    // Debounce upload operations (except for deletes)
    if (type !== 'delete') {
      this.debouncedUpload(type, filepath);
    } else {
      // Handle delete immediately
      this.handleUpload(type, filepath);
    }
  }

  private debouncedUpload(type: 'add' | 'change', filepath: string) {
    // Clear existing timer for this file
    const existingTimer = this.uploadDebounceTimers.get(filepath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.handleUpload(type, filepath);
      this.uploadDebounceTimers.delete(filepath);
    }, this.UPLOAD_DEBOUNCE_DELAY);

    this.uploadDebounceTimers.set(filepath, timer);
  }

  private async handleUpload(type: 'add' | 'change' | 'delete', filepath: string) {
    const relativePath = path.relative(this.watchedDirectory!, filepath);
    const fileName = path.basename(filepath);
    
    console.log(`[UPLOAD] ${type.toUpperCase()}: ${relativePath}`);
    
    try {
      if (type === 'delete') {
        await this.uploadService.deleteFile(relativePath);
      } else {
        // Determine content type based on file extension
        const contentType = this.getContentType(filepath);
        
        await this.uploadService.uploadFile(
          filepath,
          relativePath, // Use relative path as the cloud filename
          contentType,
          {
            chunkSize: 5 * 1024 * 1024, // 5MB chunks
            retryAttempts: 3,
            retryDelay: 1000
          }
        );
      }
    } catch (error) {
      console.error(`[UPLOAD] Error uploading ${relativePath}:`, error);
      // Emit error to renderer
      this.mainWindow.webContents.send('upload:error', {
        fileName: relativePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private getContentType(filepath: string): string {
    const ext = path.extname(filepath).toLowerCase();
    
    const contentTypeMap: Record<string, string> = {
      '.csv': 'text/csv',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
    };
    
    return contentTypeMap[ext] || 'application/octet-stream';
  }

  private notifyChange(type: 'add' | 'change' | 'delete', filepath: string) {
    const relativePath = path.relative(this.watchedDirectory!, filepath);
    this.mainWindow.webContents.send('file:change', {
      type,
      path: relativePath
    });
  }

  async stopWatching(): Promise<void> {
    // Clear all upload debounce timers
    for (const timer of this.uploadDebounceTimers.values()) {
      clearTimeout(timer);
    }
    this.uploadDebounceTimers.clear();

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