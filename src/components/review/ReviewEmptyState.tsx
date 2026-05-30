'use client'

import { BookOpenCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function ReviewEmptyState({
  onLoadDemo,
  loading,
}: {
  onLoadDemo?: () => void
  loading?: boolean
}) {
  return (
    <div className="flex flex-col items-center text-center px-4 py-12 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
        <BookOpenCheck className="w-8 h-8" aria-hidden />
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-body-lg font-semibold text-ink-primary">You&apos;re all caught up</h2>
        <p className="text-body-sm text-ink-secondary">
          Finish a lesson to add cards here, or load the demo deck to try the review flow.
        </p>
      </div>
      {onLoadDemo ? (
        <Button type="button" variant="secondary" loading={loading} onClick={onLoadDemo}>
          Load demo deck
        </Button>
      ) : null}
    </div>
  )
}
