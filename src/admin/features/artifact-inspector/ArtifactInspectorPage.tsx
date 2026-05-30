import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionCard } from '../../components/ui/SectionCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { RejectReasonDialog } from '../../components/review/RejectReasonDialog'
import { RegenerationRequestDialog } from '../../components/review/RegenerationRequestDialog'
import { reviewQueueService } from '../../services/mockServices'
import { useAdminAuthStore } from '../../store/adminAuthStore'
import { canEdit } from '../../config/roles'
import { Button } from '@/components/ui/Button'

export function ArtifactInspectorPage() {
  const { artifactId } = useParams<{ artifactId: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const role = useAdminAuthStore((s) => s.role)
  const user = useAdminAuthStore((s) => s.user)
  const canEditArtifact = canEdit(role)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [regenOpen, setRegenOpen] = useState(false)

  const { data: artifact, isLoading, error } = useQuery({
    queryKey: ['admin', 'artifact', artifactId],
    queryFn: () => reviewQueueService.getArtifact(artifactId!),
    enabled: !!artifactId,
  })

  if (!artifactId) {
    return (
      <div>
        <PageHeader title="Artifact" />
        <p className="text-ink-secondary">No artifact ID.</p>
      </div>
    )
  }

  if (error || (!isLoading && !artifact)) {
    return (
      <div>
        <PageHeader title="Artifact" />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-body-sm">
          Artifact not found or failed to load.
        </div>
        <Button variant="secondary" className="mt-4" onClick={() => router.push('/admin/queue')}>
          Back to Queue
        </Button>
      </div>
    )
  }

  if (isLoading || !artifact) {
    return (
      <div>
        <PageHeader title="Artifact" />
        <div className="py-8 text-center text-ink-tertiary text-body-sm">Loading…</div>
      </div>
    )
  }

  const { validation_report, provenance, scenario_context, content, version_history } = artifact

  return (
    <div>
      <PageHeader
        title={artifact.title}
        description={`${artifact.artifact_type} · ${artifact.scenario ?? '—'} · ${artifact.cefr_level ?? '—'}`}
      >
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/queue')}>
          <ArrowLeft className="w-4 h-4 mr-1" aria-hidden />
          Back to Queue
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SectionCard title="Content">
          <pre className="text-body-sm text-ink-primary bg-slate-50 rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">
            {JSON.stringify(content, null, 2)}
          </pre>
          {canEditArtifact && (
            <Button variant="secondary" size="sm" className="mt-3">
              Edit content
            </Button>
          )}
        </SectionCard>
        <SectionCard title="Metadata">
          <dl className="space-y-2 text-body-sm">
            <div>
              <dt className="text-ink-tertiary">Artifact ID</dt>
              <dd className="font-mono text-ink-primary">{artifact.artifact_id}</dd>
            </div>
            <div>
              <dt className="text-ink-tertiary">Review status</dt>
              <dd>
                <StatusBadge
                  status={artifact.review_status.replace('_', ' ')}
                  variant={artifact.review_status === 'completed' ? 'approved' : 'pending'}
                />
              </dd>
            </div>
            <div>
              <dt className="text-ink-tertiary">Publish status</dt>
              <dd>
                <StatusBadge
                  status={artifact.publish_status}
                  variant={
                    artifact.publish_status === 'published'
                      ? 'published'
                      : artifact.publish_status === 'draft'
                        ? 'draft'
                        : 'approved'
                  }
                />
              </dd>
            </div>
            <div>
              <dt className="text-ink-tertiary">Created</dt>
              <dd className="text-ink-primary">{artifact.created_at}</dd>
            </div>
          </dl>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SectionCard title="Validation">
          <div className="space-y-2">
            <StatusBadge
              status={validation_report.passed ? 'Pass' : 'Fail'}
              variant={validation_report.passed ? 'pass' : 'fail'}
            />
            {validation_report.score != null && (
              <span className="ml-2 text-ink-secondary">Score: {validation_report.score}</span>
            )}
            <ul className="mt-2 space-y-1 text-body-sm">
              {validation_report.checks.map((c, i) => (
                <li key={i} className={c.passed ? 'text-ink-secondary' : 'text-amber-700'}>
                  {c.name}: {c.passed ? '✓' : (c.message ?? 'failed')}
                </li>
              ))}
            </ul>
          </div>
        </SectionCard>
        <SectionCard title="Provenance">
          {provenance ? (
            <dl className="space-y-1 text-body-sm">
              <div>
                <dt className="text-ink-tertiary">Prompt</dt>
                <dd className="font-mono text-ink-primary">{provenance.prompt_template_code} v{provenance.prompt_version}</dd>
              </div>
              <div>
                <dt className="text-ink-tertiary">Model</dt>
                <dd className="text-ink-primary">{provenance.model_provider ?? '—'} {provenance.model_id ?? ''}</dd>
              </div>
              <div>
                <dt className="text-ink-tertiary">Generated</dt>
                <dd className="text-ink-primary">{provenance.generated_at}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-ink-tertiary text-body-sm">No provenance data.</p>
          )}
        </SectionCard>
      </div>

      {scenario_context && (
        <SectionCard title="Scenario context" className="mb-6">
          <pre className="text-body-sm text-ink-primary bg-slate-50 rounded p-3 overflow-auto max-h-32">
            {JSON.stringify(scenario_context, null, 2)}
          </pre>
        </SectionCard>
      )}

      {version_history && version_history.length > 0 && (
        <SectionCard title="Version history" className="mb-6">
          <ul className="space-y-2 text-body-sm">
            {version_history.map((v) => (
              <li key={v.version} className="flex items-center gap-2">
                <span className="font-medium">v{v.version}</span>
                <StatusBadge status={v.status} variant={v.status === 'published' ? 'published' : 'draft'} />
                <span className="text-ink-tertiary">{v.created_at}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title="Review decision">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={async () => {
              await reviewQueueService.submitDecision(artifact.id, { decision: 'approve', decided_by: user.email })
              queryClient.invalidateQueries({ queryKey: ['admin', 'artifact', artifactId] })
              queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
              router.push('/admin/queue')
            }}
          >
            Approve
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setRejectOpen(true)}>
            Reject
          </Button>
          {canEditArtifact && <Button variant="secondary" size="sm">Edit and approve</Button>}
          <Button variant="ghost" size="sm" onClick={() => setRegenOpen(true)}>
            Send for regeneration
          </Button>
        </div>
      </SectionCard>

      {rejectOpen && (
        <RejectReasonDialog
          onConfirm={async (reason, note) => {
            await reviewQueueService.submitDecision(artifact.id, {
              decision: 'reject',
              decided_by: user.email,
              reject_reason: reason,
              notes: note,
            })
            queryClient.invalidateQueries({ queryKey: ['admin', 'artifact', artifactId] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
            setRejectOpen(false)
            router.push('/admin/queue')
          }}
          onCancel={() => setRejectOpen(false)}
        />
      )}
      {regenOpen && (
        <RegenerationRequestDialog
          onConfirm={async (intent, hint) => {
            await reviewQueueService.submitDecision(artifact.id, {
              decision: 'send_for_regeneration',
              decided_by: user.email,
              regeneration_intent: intent,
              notes: hint,
            })
            queryClient.invalidateQueries({ queryKey: ['admin', 'artifact', artifactId] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
            setRegenOpen(false)
            router.push('/admin/queue')
          }}
          onCancel={() => setRegenOpen(false)}
        />
      )}
    </div>
  )
}
