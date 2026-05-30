import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const SECTIONS: Record<string, { title: string; message: string }> = {
  'email-preferences': {
    title: 'Email preferences',
    message: 'Manage how we contact you by email. Coming soon.',
  },
  microphone: {
    title: 'Microphone',
    message: 'Manage microphone access for voice practice. You can enable or revoke in your browser or device settings.',
  },
  privacy: {
    title: 'Privacy policy',
    message: 'Read the FluentCopilot privacy policy and how we handle your data.',
  },
  'export-data': {
    title: 'Export my data',
    message: 'Download a copy of your data. Coming soon when backend is available.',
  },
  'delete-account': {
    title: 'Delete account',
    message: 'Permanently delete your account and data. This action cannot be undone. Coming soon when backend is available.',
  },
  help: {
    title: 'Help & support',
    message: 'Contact FluentCopilot support for help with your account, access, or product questions.',
  },
}

export function SettingsPlaceholderPage() {
  const router = useRouter()
  const { section } = useParams<{ section: string }>()
  const config = section ? SECTIONS[section] : null
  const title = config?.title ?? 'Settings'
  const message = config?.message ?? 'Coming soon.'

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-title font-bold text-ink-primary">{title}</h1>
      <p className="text-body text-ink-secondary">{message}</p>
      <Button variant="ghost" fullWidth onClick={() => router.push('/app/settings')}>
        Back to Settings
      </Button>
    </div>
  )
}
