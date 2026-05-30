import { ReactNode } from 'react'
import { Mic, MapPin, Bell } from 'lucide-react'
import { Button } from './Button'
import { Card, CardTitle, CardDescription } from './Card'

type PermissionType = 'microphone' | 'geolocation' | 'notifications'

interface PermissionGateProps {
  type: PermissionType
  granted: boolean
  onRequest: () => void
  onFallback?: () => void
  children: ReactNode
  fallbackMessage?: string
}

const config: Record<
  PermissionType,
  { icon: ReactNode; title: string; description: string }
> = {
  microphone: {
    icon: <Mic className="w-10 h-10" />,
    title: 'Microphone access',
    description:
      'We need microphone access for voice practice and pronunciation. You can enable it in your browser settings.',
  },
  geolocation: {
    icon: <MapPin className="w-10 h-10" />,
    title: 'Location access',
    description:
      'Optional: location helps us suggest phrases for where you are. You can skip or enable in settings.',
  },
  notifications: {
    icon: <Bell className="w-10 h-10" />,
    title: 'Notifications',
    description: 'Get reminders to practice. You can change this in settings.',
  },
}

export function PermissionGate({
  type,
  granted,
  onRequest,
  onFallback,
  children,
  fallbackMessage,
}: PermissionGateProps) {
  if (granted) return <>{children}</>

  const { icon, title, description } = config[type]
  return (
    <div className="p-4">
      <Card variant="outlined" className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="mt-2">{description}</CardDescription>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={onRequest} fullWidth>
            Enable
          </Button>
          {onFallback && (
            <Button variant="ghost" onClick={onFallback}>
              {fallbackMessage ?? 'Not now'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
