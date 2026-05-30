import { Card } from '@/components/ui/Card'
import { Target } from 'lucide-react'

export function ScenarioGoalCard({ goals }: { goals: string[] }) {
  return (
    <Card variant="flat" padding="md" className="border border-primary-100 bg-primary-50/35">
      <div className="flex items-center gap-2 text-body-sm font-semibold text-ink-primary">
        <Target className="w-4 h-4 text-primary-600 shrink-0" aria-hidden />
        Your goal
      </div>
      <ul className="mt-2 space-y-1.5 list-none">
        {goals.map((g) => (
          <li key={g} className="text-body-sm text-ink-primary leading-snug pl-0 flex gap-2">
            <span className="text-primary-500 font-bold" aria-hidden>
              ·
            </span>
            <span>{g}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
