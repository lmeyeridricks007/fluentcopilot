'use client'

import { Card, CardDescription, CardTitle } from '@/components/ui/Card'

export function SpeakingLearnerAnswerCard({ text }: { text: string }) {
  return (
    <Card variant="flat" padding="md" className="border border-slate-200 bg-slate-50/60">
      <CardTitle className="text-body font-semibold text-ink-primary">Jouw antwoord</CardTitle>
      <CardDescription className="mt-1 text-caption text-ink-tertiary">Zoals ingediend (getypt of transcript)</CardDescription>
      <p className="mt-2 text-body text-ink-primary leading-relaxed whitespace-pre-wrap">{text}</p>
    </Card>
  )
}
