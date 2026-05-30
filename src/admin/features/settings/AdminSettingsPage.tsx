import { PageHeader } from '../../components/ui/PageHeader'
import { SectionCard } from '../../components/ui/SectionCard'
import { useAdminAuthStore } from '../../store/adminAuthStore'

export function AdminSettingsPage() {
  const { user, role } = useAdminAuthStore()
  return (
    <div>
      <PageHeader title="Settings" description="Admin preferences and environment" />
      <SectionCard title="Role">
        <p className="text-body-sm text-ink-primary">Current role: <strong>{role}</strong></p>
        <p className="text-caption text-ink-tertiary mt-1">Switch role from the top bar to test permission UI.</p>
      </SectionCard>
      <SectionCard title="User">
        <p className="text-body-sm text-ink-primary">{user.name}</p>
        <p className="text-caption text-ink-tertiary">{user.email}</p>
      </SectionCard>
      <SectionCard title="Environment">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-caption bg-slate-100 text-ink-secondary">Dev</span>
      </SectionCard>
    </div>
  )
}
