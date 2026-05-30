import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function NotificationSettingsPage() {
  const router = useRouter()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(false)

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-title font-bold text-ink-primary">Notifications</h1>
      <Card variant="outlined" padding="md">
        <CardTitle>Email</CardTitle>
        <CardDescription>Receive reminders and progress updates by email.</CardDescription>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-body-sm text-ink-secondary">Email notifications</span>
          <button
            type="button"
            role="switch"
            aria-checked={emailNotifications}
            onClick={() => setEmailNotifications((v) => !v)}
            className={`relative w-11 h-6 rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 ${
              emailNotifications ? 'bg-primary-500 border-primary-500' : 'bg-slate-200 border-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white border border-slate-200 transition-transform ${
                emailNotifications ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </Card>
      <Card variant="outlined" padding="md">
        <CardTitle>Push notifications</CardTitle>
        <CardDescription>Get practice reminders on this device. Enable in your browser or device settings.</CardDescription>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-body-sm text-ink-secondary">Push enabled</span>
          <button
            type="button"
            role="switch"
            aria-checked={pushEnabled}
            onClick={() => setPushEnabled((v) => !v)}
            className={`relative w-11 h-6 rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 ${
              pushEnabled ? 'bg-primary-500 border-primary-500' : 'bg-slate-200 border-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white border border-slate-200 transition-transform ${
                pushEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <p className="text-caption text-ink-tertiary mt-2">Push registration will be available when backend is connected.</p>
      </Card>
      <Button variant="ghost" fullWidth onClick={() => router.push('/app/settings')}>
        Back to Settings
      </Button>
    </div>
  )
}
