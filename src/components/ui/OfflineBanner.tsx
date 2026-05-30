import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online) return null

  return (
    <div
      className="bg-warning/90 text-ink-primary py-2 px-4 flex items-center justify-center gap-2 text-body-sm font-medium"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden />
      You're offline. Some features may be limited.
    </div>
  )
}
