import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionCard } from '../../components/ui/SectionCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { reviewQueueService } from '../../services/mockServices'
import { useQueueFilterStore } from '../../store/queueFilterStore'
import type { ArtifactType, ReviewStatus } from '../../types/artifacts'

const ARTIFACT_TYPES: ArtifactType[] = [
  'VocabularyItem',
  'PhraseItem',
  'Dialogue',
  'LessonBlueprint',
  'LessonInstance',
  'ExerciseInstance',
  'PronunciationTarget',
  'ExamTask',
  'ReflectionLessonDraft',
  'PromptTemplate',
]

const REVIEW_STATUSES: ReviewStatus[] = ['pending_review', 'in_review', 'completed']

export function ReviewQueuePage() {
  const { artifact_type, review_status, scenario, setArtifactType, setReviewStatus, setScenario } =
    useQueueFilterStore()

  const { data: items, isLoading } = useQuery({
    queryKey: ['admin', 'queue', artifact_type, review_status, scenario],
    queryFn: () =>
      reviewQueueService.listQueue({
        ...(artifact_type ? { artifact_type } : {}),
        ...(review_status ? { review_status } : {}),
        ...(scenario ? { scenario } : {}),
      }),
  })

  const list = items ?? []

  return (
    <div>
      <PageHeader
        title="Review Queue"
        description="Inspect and decide on generated content"
      />
      <SectionCard title="Filters" className="mb-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-caption text-ink-tertiary mb-1">Artifact type</label>
            <select
              value={artifact_type}
              onChange={(e) => setArtifactType((e.target.value as ArtifactType) || '')}
              className="border border-slate-200 rounded-lg px-3 py-2 text-body-sm bg-white min-w-[180px]"
            >
              <option value="">All</option>
              {ARTIFACT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-caption text-ink-tertiary mb-1">Review status</label>
            <select
              value={review_status}
              onChange={(e) => setReviewStatus((e.target.value as ReviewStatus) || '')}
              className="border border-slate-200 rounded-lg px-3 py-2 text-body-sm bg-white min-w-[160px]"
            >
              <option value="">All</option>
              {REVIEW_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-caption text-ink-tertiary mb-1">Scenario</label>
            <input
              type="text"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="e.g. cafe"
              className="border border-slate-200 rounded-lg px-3 py-2 text-body-sm bg-white min-w-[120px]"
            />
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Queue">
        {isLoading ? (
          <div className="py-8 text-center text-ink-tertiary text-body-sm">Loading…</div>
        ) : list.length === 0 ? (
          <div className="py-8 text-center text-ink-tertiary text-body-sm">No items match filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-ink-tertiary">
                  <th className="pb-2 pr-4 font-medium">Title</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Scenario</th>
                  <th className="pb-2 pr-4 font-medium">Validation</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/artifact/${item.artifact_id}`}
                        className="font-medium text-primary-600 hover:underline"
                      >
                        {item.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-ink-secondary">{item.artifact_type}</td>
                    <td className="py-3 pr-4 text-ink-secondary">{item.scenario ?? '—'}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge
                        status={item.validation_status}
                        variant={
                          item.validation_status === 'pass'
                            ? 'pass'
                            : item.validation_status === 'fail'
                              ? 'fail'
                              : 'warning'
                        }
                      />
                      {item.validation_score != null && (
                        <span className="ml-1 text-ink-tertiary">{item.validation_score}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge
                        status={item.review_status.replace('_', ' ')}
                        variant={
                          item.review_status === 'completed' ? 'approved' : 'pending'
                        }
                      />
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/admin/artifact/${item.artifact_id}`}
                        className="inline-flex items-center justify-center font-medium rounded-lg px-3 py-2 text-body-sm bg-surface-muted text-ink-primary hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
                      >
                        Open
                      </Link>
                    </td>
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
