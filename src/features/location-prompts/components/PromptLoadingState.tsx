/**
 * FD-08 — loading state for prompt feed/detail.
 */

import { Card } from '@/components/ui/Card'

export function PromptLoadingState() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <Card key={i} variant="outlined" padding="md">
          <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
          <div className="h-3 bg-slate-100 rounded w-full mb-2" />
          <div className="h-3 bg-slate-100 rounded w-4/5" />
        </Card>
      ))}
    </div>
  )
}
