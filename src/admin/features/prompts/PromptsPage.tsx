import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionCard } from '../../components/ui/SectionCard'
import { promptLibraryService } from '../../services/mockServices'

export function PromptsPage() {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['admin', 'prompts'],
    queryFn: () => promptLibraryService.listTemplates(),
  })
  const list = templates ?? []

  return (
    <div>
      <PageHeader title="Prompt Library" description="Prompt templates and versions" />
      <SectionCard title="Templates">
        {isLoading ? (
          <div className="py-8 text-center text-ink-tertiary text-body-sm">Loading…</div>
        ) : list.length === 0 ? (
          <div className="py-8 text-center text-ink-tertiary text-body-sm">No templates.</div>
        ) : (
          <ul className="space-y-3">
            {list.map((t) => (
              <li key={t.code} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-medium text-ink-primary">{t.name}</p>
                  <p className="text-caption text-ink-tertiary font-mono">{t.code}</p>
                </div>
                <span className="text-body-sm text-ink-secondary">v{t.versions.join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
