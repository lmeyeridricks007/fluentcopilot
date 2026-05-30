import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionCard } from '../../components/ui/SectionCard'
import { auditService } from '../../services/mockServices'

export function AuditLogsPage() {
  const { data: events, isLoading } = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => auditService.listEvents(),
  })
  const list = events ?? []

  return (
    <div>
      <PageHeader title="Audit Logs" description="Who did what and when" />
      <SectionCard title="Events">
        {isLoading ? (
          <div className="py-8 text-center text-ink-tertiary text-body-sm">Loading…</div>
        ) : list.length === 0 ? (
          <div className="py-8 text-center text-ink-tertiary text-body-sm">No audit events.</div>
        ) : (
          <ul className="space-y-2">
            {list.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 py-2 border-b border-slate-100 text-body-sm">
                <span className="text-ink-tertiary">{e.timestamp}</span>
                <span className="font-medium text-ink-primary">{e.actor_name}</span>
                <span className="text-ink-secondary">{e.action}</span>
                {e.artifact_type && <span className="text-ink-tertiary">{e.artifact_type} {e.artifact_id}</span>}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
