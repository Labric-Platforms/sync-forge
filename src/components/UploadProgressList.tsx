import { useEffect, useState } from 'react';
import { UploadProgress } from '@/types/electron';
import { FileText, CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';

export function UploadProgressList() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  useEffect(() => {
    window.api.onUploadProgress((progress: UploadProgress) => {
      setUploadProgress(prev => {
        const existing = prev.findIndex(p => p.fileName === progress.fileName);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = progress;
          return updated;
        } else {
          return [...prev, progress];
        }
      });
    });
  }, []);

  // Clean up completed uploads after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setUploadProgress(prev => prev.filter(p => p.status === 'uploading' || p.status === 'pending'));
    }, 5000);

    return () => clearTimeout(timer);
  }, [uploadProgress]);

  const activeUploads = uploadProgress.filter(p => 
    p.status === 'uploading' || p.status === 'pending' || p.status === 'error'
  );

  if (activeUploads.length === 0) {
    return null;
  }

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (progress: UploadProgress) => {
    switch (progress.status) {
      case 'pending':
        return 'Queued';
      case 'uploading':
        return `${progress.percentage}%`;
      case 'completed':
        return 'Completed';
      case 'error':
        return progress.error || 'Error';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="border rounded-lg p-4 mb-4">
      <h3 className="text-sm font-medium mb-3">Sync Progress</h3>
      <div className="space-y-2">
        {activeUploads.map((progress) => (
          <div key={progress.fileName} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
            {getStatusIcon(progress.status)}
            <FileText className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{progress.fileName}</div>
              {progress.status === 'uploading' && progress.totalBytes > 0 && (
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(progress.bytesUploaded)} / {formatFileSize(progress.totalBytes)}
                </div>
              )}
            </div>
            <div className="text-xs font-medium">
              {getStatusText(progress)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 