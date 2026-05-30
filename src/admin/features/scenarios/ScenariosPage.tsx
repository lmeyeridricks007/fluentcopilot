import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionCard } from '../../components/ui/SectionCard'
import { scenarioService } from '../../services/mockServices'

export function ScenariosPage() {
  const { data: scenarios, isLoading } = useQuery({
    queryKey: ['admin', 'scenarios'],
    queryFn: () => scenarioService.listScenarios(),
  })
  const list = scenarios ?? []

  return (
    <div>
      <PageHeader title="Scenario Library" description="Scenarios and linked content" />
      <SectionCard title="Scenarios">
        {isLoading ? (
          <div className="py-8 text-center text-ink-tertiary text-body-sm">Loading…</div>
        ) : list.length === 0 ? (
          <div className="py-8 text-center text-ink-tertiary text-body-sm">No scenarios.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-ink-tertiary">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  <th className="pb-2 font-medium">Artifacts</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-ink-primary">{s.name}</td>
                    <td className="py-3 pr-4 text-ink-secondary">{s.category}</td>
                    <td className="py-3">{s.artifact_count}</td>
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
