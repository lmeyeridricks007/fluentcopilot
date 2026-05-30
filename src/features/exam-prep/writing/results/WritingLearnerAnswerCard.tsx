'use client'

import { Card, CardTitle } from '@/components/ui/Card'

export function WritingLearnerAnswerCard({ text }: { text: string }) {
  return (
    <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
      <CardTitle className="text-body font-semibold text-ink-primary">Uw ingeleverde tekst</CardTitle>
      <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">{text}</p>
    </Card>
  )
}
