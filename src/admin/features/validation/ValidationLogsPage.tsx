import { PageHeader } from '../../components/ui/PageHeader'
import { SectionCard } from '../../components/ui/SectionCard'

export function ValidationLogsPage() {
  return (
    <div>
      <PageHeader title="Validation Logs" description="Validation runs and results" />
      <SectionCard title="Validation runs">
        <div className="py-8 text-center text-ink-tertiary text-body-sm">
          Validation log entries will appear here when backend is connected.
        </div>
      </SectionCard>
    </div>
  )
}
