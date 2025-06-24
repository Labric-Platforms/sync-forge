import { useState, useEffect } from "react"
import { Wifi, WifiOff } from "lucide-react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export function OnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <Dialog>
      <DialogTrigger>
        <div className="flex items-center gap-1">
          {isOnline ? (
            <>
              <Wifi className="w-3 h-3 text-green-500" />
              <span className="text-green-500">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-red-500" />
              <span className="text-red-500">Offline</span>
            </>
          )}
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Connectivity Info
          </DialogTitle>
          <DialogDescription>
            Connectivity Info from this device
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
} 