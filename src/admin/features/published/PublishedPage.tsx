import { PageHeader } from '../../components/ui/PageHeader'
import { SectionCard } from '../../components/ui/SectionCard'

export function PublishedPage() {
  return (
    <div>
      <PageHeader title="Published Content" description="Published artifacts and versions" />
      <SectionCard title="Published list">
        <div className="py-8 text-center text-ink-tertiary text-body-sm">
          No published content in mock. Use Review Queue to approve, then publish from artifact inspector.
        </div>
      </SectionCard>
    </div>
  )
}
