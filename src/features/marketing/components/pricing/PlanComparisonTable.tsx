import { Check, Minus } from 'lucide-react'

export type ComparisonRow = {
  category: string
  free: string
  core: string
  premium: string
  freeLevel: 'full' | 'partial' | 'none'
  coreLevel: 'full' | 'partial' | 'none'
  premiumLevel: 'full' | 'partial' | 'none'
}

function LevelCell({ level, label }: { level: 'full' | 'partial' | 'none'; label: string }) {
  const icon =
    level === 'full' ? (
      <Check className="h-5 w-5 text-primary-700 shrink-0" aria-label="Included" />
    ) : level === 'partial' ? (
      <span className="text-caption font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md shrink-0">
        Limited
      </span>
    ) : (
      <Minus className="h-5 w-5 text-slate-500 shrink-0" aria-label="Not included" />
    )

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 py-3 sm:py-4">
      <div className="flex items-start gap-2 min-w-0">
        <span className="mt-0.5">{icon}</span>
        <span className="text-body-sm text-ink-secondary leading-snug">{label}</span>
      </div>
    </div>
  )
}

export function PlanComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <>
      <div className="md:hidden space-y-4">
        {rows.map((row) => (
          <article key={row.category} className="rounded-card border border-slate-200 bg-surface-elevated p-4 shadow-card">
            <h3 className="text-body font-bold text-ink-primary">{row.category}</h3>
            <div className="mt-3 space-y-3 text-body-sm">
              <div>
                <p className="font-semibold text-ink-primary">Free</p>
                <LevelCell level={row.freeLevel} label={row.free} />
              </div>
              <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-3">
                <p className="font-semibold text-primary-900">Core</p>
                <LevelCell level={row.coreLevel} label={row.core} />
              </div>
              <div>
                <p className="font-semibold text-ink-primary">Premium</p>
                <LevelCell level={row.premiumLevel} label={row.premium} />
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden md:block rounded-card border border-slate-200 bg-surface-elevated overflow-hidden shadow-card">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-surface-muted">
              <th scope="col" className="px-4 py-4 text-body-sm font-bold text-ink-primary w-[16%] min-w-[100px]">
                Area
              </th>
              <th scope="col" className="px-4 py-4 text-body-sm font-bold text-ink-primary w-[28%] border-l border-slate-200">
                Free
              </th>
              <th
                scope="col"
                className="px-4 py-4 text-body-sm font-bold text-primary-900 w-[28%] border-l border-primary-200 bg-primary-50/90"
              >
                Core
              </th>
              <th
                scope="col"
                className="px-4 py-4 text-body-sm font-bold text-ink-primary w-[28%] border-l border-slate-200 bg-surface-elevated"
              >
                Premium
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.category} className="border-b border-slate-100 last:border-0 align-top">
                <th
                  scope="row"
                  className="px-4 py-3 text-body-sm font-semibold text-ink-primary bg-surface-muted/50 align-top"
                >
                  {row.category}
                </th>
                <td className="px-4 align-top border-l border-slate-100 bg-surface-elevated">
                  <LevelCell level={row.freeLevel} label={row.free} />
                </td>
                <td className="px-4 align-top border-l border-slate-100 bg-primary-50/40">
                  <LevelCell level={row.coreLevel} label={row.core} />
                </td>
                <td className="px-4 align-top border-l border-slate-100 bg-surface-elevated">
                  <LevelCell level={row.premiumLevel} label={row.premium} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </>
  )
}
