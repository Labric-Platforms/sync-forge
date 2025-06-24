import fs from 'node:fs';
import { EventEmitter } from 'events';

export interface UploadProgress {
  fileName: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface UploadOptions {
  chunkSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export class UploadService extends EventEmitter {
  private readonly DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks (increased from 5MB)
  private readonly DEFAULT_RETRY_ATTEMPTS = 3;
  private readonly DEFAULT_RETRY_DELAY = 500; // Reduced from 1000ms for faster retries

  constructor() {
    super();
  }

  async uploadFile(
    filePath: string, 
    fileName: string, 
    contentType: string,
    options: UploadOptions = {}
  ): Promise<void> {
    const {
      chunkSize = this.DEFAULT_CHUNK_SIZE,
      retryAttempts = this.DEFAULT_RETRY_ATTEMPTS,
      retryDelay = this.DEFAULT_RETRY_DELAY
    } = options;

    const stats = fs.statSync(filePath);
    const totalBytes = stats.size;

    // Emit initial progress
    this.emitProgress(fileName, 0, totalBytes, 'pending');

    try {
      // Get presigned URL (resumable upload session)
      const uploadUrl = await this.getPresignedUrl(fileName, contentType);
      
      // Upload file in chunks using resumable upload protocol
      await this.uploadInChunks(filePath, uploadUrl, totalBytes, chunkSize, retryAttempts, retryDelay, fileName);
      
      // Emit completion
      this.emitProgress(fileName, totalBytes, totalBytes, 'completed');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emitProgress(fileName, 0, totalBytes, 'error', errorMessage);
      throw error;
    }
  }

  private emitProgress(fileName: string, bytesUploaded: number, totalBytes: number, status: UploadProgress['status'], error?: string) {
    const percentage = totalBytes > 0 ? Math.round((bytesUploaded / totalBytes) * 100) : 0;
    
    this.emit('progress', {
      fileName,
      bytesUploaded,
      totalBytes,
      percentage,
      status,
      error
    } as UploadProgress);
  }

  private async getPresignedUrl(fileName: string, contentType: string): Promise<string> {
    console.log(`[UPLOAD] Getting presigned URL for: ${fileName} (${contentType})`);
    
    try {
      const response = await fetch('http://localhost:3001/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          contentType
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get presigned URL: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.uploadUrl) {
        throw new Error('No upload URL received from API');
      }

      console.log(`[UPLOAD] Received presigned URL for: ${fileName}`);
      return data.uploadUrl;
      
    } catch (error) {
      console.error(`[UPLOAD] Error getting presigned URL for ${fileName}:`, error);
      throw error;
    }
  }

  private async uploadInChunks(
    filePath: string,
    uploadUrl: string,
    totalBytes: number,
    chunkSize: number,
    retryAttempts: number,
    retryDelay: number,
    fileName: string
  ): Promise<void> {
    const fileHandle = await fs.promises.open(filePath, 'r');
    let bytesUploaded = 0;

    try {
      // Use a larger buffer for better performance
      const buffer = Buffer.alloc(chunkSize);
      
      while (bytesUploaded < totalBytes) {
        const remainingBytes = totalBytes - bytesUploaded;
        const currentChunkSize = Math.min(chunkSize, remainingBytes);
        
        // Read chunk from file
        const { bytesRead } = await fileHandle.read(buffer, 0, currentChunkSize, bytesUploaded);
        
        if (bytesRead === 0) {
          break; // End of file
        }

        // Create a slice of the buffer with only the bytes we read
        const actualChunk = buffer.slice(0, bytesRead);
        
        // Upload this chunk using resumable upload protocol
        await this.uploadChunkWithRetry(
          uploadUrl,
          actualChunk,
          bytesUploaded,
          totalBytes,
          retryAttempts,
          retryDelay
        );
        
        bytesUploaded += bytesRead;
        
        // Emit progress (but not for the final chunk)
        if (bytesUploaded < totalBytes) {
          this.emitProgress(fileName, bytesUploaded, totalBytes, 'uploading');
        }
      }
    } finally {
      await fileHandle.close();
    }
  }

  private async uploadChunkWithRetry(
    uploadUrl: string,
    chunk: Buffer,
    startByte: number,
    totalBytes: number,
    retryAttempts: number,
    retryDelay: number
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        await this.uploadChunk(uploadUrl, chunk, startByte, totalBytes);
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < retryAttempts) {
          // Use shorter delays for faster retries
          const delay = retryDelay * Math.pow(1.5, attempt); // Less aggressive backoff
          console.log(`[UPLOAD] Chunk upload failed, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retryAttempts})`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private async uploadChunk(
    uploadUrl: string,
    chunk: Buffer,
    startByte: number,
    totalBytes: number
  ): Promise<void> {
    const endByte = startByte + chunk.length - 1;
    const contentRange = `bytes ${startByte}-${endByte}/${totalBytes}`;

    console.log(`[UPLOAD] Uploading chunk: ${contentRange} (${chunk.length} bytes)`);

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': contentRange,
        'Content-Length': chunk.length.toString(),
        'Content-Type': 'application/octet-stream'
      },
      body: chunk
    });

    // Handle resumable upload responses
    if (response.status === 308) {
      // 308 Resume Incomplete - this is expected for resumable uploads
      // Check if we have a Range header in the response to see what was uploaded
      const rangeHeader = response.headers.get('Range');
      if (rangeHeader) {
        console.log(`[UPLOAD] Resume incomplete, server reports: ${rangeHeader}`);
      }
      return; // This is success for resumable uploads
    }

    if (response.status === 200 || response.status === 201) {
      // Upload completed successfully
      console.log(`[UPLOAD] Upload completed successfully`);
      return;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[UPLOAD] Upload failed: ${response.status} ${response.statusText}`);
      console.error(`[UPLOAD] Error response: ${errorText}`);
      console.error(`[UPLOAD] Request details: ${contentRange}, chunk size: ${chunk.length}`);
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async deleteFile(fileName: string): Promise<void> {
    console.log(`[UPLOAD] Deleting file: ${fileName}`);
    
    // TODO: Implement actual delete logic
    this.emitProgress(fileName, 0, 0, 'completed');
  }
} 