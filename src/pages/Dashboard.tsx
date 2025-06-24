import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FolderOpen, FileText, Trash2, Plus, RefreshCw, Laptop } from "lucide-react"
import { DeviceInfo } from "@/types/device"
import { SyncStatus } from "@/components/SyncStatus"
import { UploadProgressList } from "@/components/UploadProgressList"
import { OnlineStatus } from "@/components/OnlineStatus"

type FileChange = {
  type: 'add' | 'change' | 'delete'
  path: string
  timestamp: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [directory, setDirectory] = useState<string | null>(null)
  const [fileChanges, setFileChanges] = useState<FileChange[]>([])
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)

  useEffect(() => {
    window.api.getDeviceInfo().then(setDeviceInfo)

    if (directory) {
      window.api.onFileChange((data: { type: 'add' | 'change' | 'delete'; path: string }) => {
        setFileChanges(prev => [{
          ...data,
          timestamp: Date.now()
        }, ...prev])
      })

      return () => {
        window.api.stopWatching()
      }
    }
  }, [directory])

  const handleSelectDirectory = async () => {
    const selected = await window.api.openDirectory()
    if (selected) {
      setDirectory(selected)
      setFileChanges([])
    }
  }

  const getFileIcon = (type: FileChange['type']) => {
    switch (type) {
      case 'add':
        return <Plus className="w-4 h-4 text-green-500" />
      case 'change':
        return <RefreshCw className="w-4 h-4 text-blue-500" />
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-500" />
    }
  }

  return (
    <div className="flex flex-col h-svh pb-6">
      <div className="flex-1 p-6 gap-6 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleSelectDirectory}
              className="flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              {directory ? 'Change Directory' : 'Select Directory'}
            </Button>
            {directory && (
              <span className="text-sm text-muted-foreground">
                Watching: {directory}
              </span>
            )}
          </div>
        </div>

        {directory ? (
          <>
            <UploadProgressList />
            <ScrollArea className="flex-1 border rounded-lg mb-4">
              {fileChanges.length > 0 ? (
                <div className="p-4 space-y-2">
                  {fileChanges.map((change, index) => (
                    <div
                      key={`${change.path}-${change.timestamp}-${index}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/file/${encodeURIComponent(change.path)}`)}
                    >
                      {getFileIcon(change.type)}
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm flex-1 truncate">
                        {change.path}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(change.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No file changes detected yet
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a directory to start monitoring file changes
          </div>
        )}
      </div>
      
      <div className="h-6 border-t flex items-center px-2 text-xs text-muted-foreground fixed bottom-0 left-0 right-0 bg-background">
        <div className="flex items-center gap-4">
          {deviceInfo && (
            <div className="flex items-center gap-1">
              <Laptop className="w-3 h-3" />
              <span>{deviceInfo?.hostname || 'Unknown Device'}</span>
            </div>
          )}
          <SyncStatus />
        </div>

        <div className="flex ml-auto">
          <OnlineStatus />
        </div>
      </div>
    </div>
  )
} 