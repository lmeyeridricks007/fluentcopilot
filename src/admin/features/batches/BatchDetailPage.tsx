import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionCard } from '../../components/ui/SectionCard'
import { StatCard } from '../../components/ui/StatCard'
import { batchService } from '../../services/mockServices'
import { Button } from '@/components/ui/Button'

export function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>()
  const router = useRouter()
  const { data: batch, isLoading } = useQuery({
    queryKey: ['admin', 'batch', batchId],
    queryFn: () => batchService.getBatch(batchId!),
    enabled: !!batchId,
  })
  const { data: artifacts } = useQuery({
    queryKey: ['admin', 'batch-artifacts', batchId],
    queryFn: () => batchService.getBatchArtifacts(batchId!),
    enabled: !!batchId,
  })

  if (!batchId) return <div><PageHeader title="Batch" /><p className="text-ink-secondary">No batch ID.</p></div>
  if (isLoading || !batch) return <div><PageHeader title="Batch" /><div className="py-8 text-center text-ink-tertiary">Loading…</div></div>

  return (
    <div>
      <PageHeader title={batch.name} description={`Batch ${batch.id} · ${batch.status}`}>
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/batches')}>
          <ArrowLeft className="w-4 h-4 mr-1" aria-hidden />
          Back to Batches
        </Button>
      </PageHeader>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Generated" value={batch.counts.generated} />
        <StatCard label="Pending review" value={batch.counts.pending_review} />
        <StatCard label="Approved" value={batch.counts.approved} />
        <StatCard label="Published" value={batch.counts.published} />
      </div>
      <SectionCard title="Artifacts in this batch">
        {!artifacts?.length ? (
          <div className="py-6 text-center text-ink-tertiary text-body-sm">No artifacts.</div>
        ) : (
          <ul className="space-y-2">
            {artifacts.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/artifact/${a.artifact_id}`} className="font-medium text-primary-600 hover:underline">
                  {a.title}
                </Link>
                <span className="ml-2 text-body-sm text-ink-tertiary">{a.artifact_type} · {a.review_status}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
