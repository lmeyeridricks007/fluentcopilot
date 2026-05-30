import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionCard } from '../../components/ui/SectionCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { batchService } from '../../services/mockServices'

export function BatchesPage() {
  const { data: batches, isLoading } = useQuery({
    queryKey: ['admin', 'batches'],
    queryFn: () => batchService.listBatches(),
  })
  const list = batches ?? []

  return (
    <div>
      <PageHeader title="Batches" description="Generation batch runs and counts" />
      <SectionCard title="Batch list">
        {isLoading ? (
          <div className="py-8 text-center text-ink-tertiary text-body-sm">Loading…</div>
        ) : list.length === 0 ? (
          <div className="py-8 text-center text-ink-tertiary text-body-sm">No batches.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-ink-tertiary">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Generated</th>
                  <th className="pb-2 pr-4 font-medium">Pending review</th>
                  <th className="pb-2 pr-4 font-medium">Approved</th>
                  <th className="pb-2 font-medium">Published</th>
                </tr>
              </thead>
              <tbody>
                {list.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/batches/${b.id}`} className="font-medium text-primary-600 hover:underline">
                        {b.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={b.status} variant="pending" />
                    </td>
                    <td className="py-3 pr-4">{b.counts.generated}</td>
                    <td className="py-3 pr-4">{b.counts.pending_review}</td>
                    <td className="py-3 pr-4">{b.counts.approved}</td>
                    <td className="py-3">{b.counts.published}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
