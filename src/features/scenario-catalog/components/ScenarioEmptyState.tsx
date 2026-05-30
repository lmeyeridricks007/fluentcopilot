import Link from 'next/link'
import { Search } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function ScenarioEmptyState({
  onResetFilters,
  weakOnly,
}: {
  onResetFilters: () => void
  weakOnly: boolean
}) {
  return (
    <Card variant="outlined" padding="md" className="border-dashed border-slate-200 bg-surface-muted/30">
      <div className="flex flex-col items-center text-center py-6 px-2">
        <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mb-3">
          <Search className="w-6 h-6 text-ink-tertiary" aria-hidden />
        </div>
        <p className="text-body font-semibold text-ink-primary">No scenarios match</p>
        <p className="text-body-sm text-ink-secondary mt-1 max-w-xs">
          {weakOnly
            ? 'No catalog entries are linked to your current weak tags yet — try clearing filters or browse all.'
            : 'Try removing a filter or pick another category.'}
        </p>
        <Button type="button" variant="secondary" className="mt-4" onClick={onResetFilters}>
          Clear filters
        </Button>
        <Link href="/app/practice" className="text-body-sm text-primary-600 font-medium mt-3 hover:underline">
          Back to Practice hub
        </Link>
      </div>
    </Card>
  )
}
