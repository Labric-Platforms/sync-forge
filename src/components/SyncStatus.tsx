import { useEffect, useState } from 'react';
import { UploadProgress } from '@/types/electron';
import { Cloud, CloudOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface SyncStatusProps {
  className?: string;
}

export function SyncStatus({ className = '' }: SyncStatusProps) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Listen for upload progress updates
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

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Clean up completed uploads after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setUploadProgress(prev => prev.filter(p => p.status === 'uploading' || p.status === 'pending'));
    }, 3000);

    return () => clearTimeout(timer);
  }, [uploadProgress]);

  const pendingUploads = uploadProgress.filter(p => p.status === 'pending').length;
  const uploadingFiles = uploadProgress.filter(p => p.status === 'uploading').length;
  const completedUploads = uploadProgress.filter(p => p.status === 'completed').length;
  const errorUploads = uploadProgress.filter(p => p.status === 'error').length;

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (uploadingFiles > 0) return `Syncing ${uploadingFiles} file${uploadingFiles > 1 ? 's' : ''}`;
    if (pendingUploads > 0) return `Queued ${pendingUploads} file${pendingUploads > 1 ? 's' : ''}`;
    if (errorUploads > 0) return `${errorUploads} error${errorUploads > 1 ? 's' : ''}`;
    if (completedUploads > 0) return 'Synced';
    return 'Ready';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <CloudOff className="w-3 h-3 text-red-500" />;
    if (uploadingFiles > 0) return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
    if (pendingUploads > 0) return <Cloud className="w-3 h-3 text-yellow-500" />;
    if (errorUploads > 0) return <AlertCircle className="w-3 h-3 text-red-500" />;
    if (completedUploads > 0) return <CheckCircle className="w-3 h-3 text-green-500" />;
    return <Cloud className="w-3 h-3 text-muted-foreground" />;
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (uploadingFiles > 0) return 'text-blue-500';
    if (pendingUploads > 0) return 'text-yellow-500';
    if (errorUploads > 0) return 'text-red-500';
    if (completedUploads > 0) return 'text-green-500';
    return 'text-muted-foreground';
  };

  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      {getStatusIcon()}
      <span className={getStatusColor()}>{getStatusText()}</span>
    </div>
  );
} 