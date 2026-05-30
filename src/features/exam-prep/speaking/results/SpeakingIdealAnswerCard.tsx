'use client'

import { Card, CardDescription, CardTitle } from '@/components/ui/Card'

export function SpeakingIdealAnswerCard({
  dutch,
  noteEn,
}: {
  dutch: string
  noteEn?: string
}) {
  return (
    <Card variant="flat" padding="md" className="border border-slate-200 bg-slate-50/90">
      <CardTitle className="text-body font-semibold text-ink-primary">Ideaal modelantwoord (examenstijl)</CardTitle>
      <CardDescription className="mt-1 text-caption text-ink-tertiary leading-snug">
        Sterk voorbeeld bij deze vraag — niet jouw persoonlijke versie.
      </CardDescription>
      <p className="mt-3 text-body text-ink-primary leading-relaxed whitespace-pre-wrap">{dutch}</p>
      {noteEn ? (
        <CardDescription className="mt-3 text-body-sm text-ink-secondary leading-snug border-t border-slate-200/80 pt-2">
          <span className="font-medium text-ink-secondary">Why this works: </span>
          {noteEn}
        </CardDescription>
      ) : null}
    </Card>
  )
}
