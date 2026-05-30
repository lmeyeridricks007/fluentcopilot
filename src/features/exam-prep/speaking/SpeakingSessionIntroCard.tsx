'use client'

import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  DEFAULT_SPEAKING_TRAINING_SESSION_SIZE,
  defaultSpeakingTrainingScenarioOptions,
} from '@/lib/exam-prep/speaking/speakingSessionBuilder'
import { SPEAKING_SCENARIO_GROUP_LABELS } from '@/lib/exam-prep/speaking/speakingScenarioGrouping'
import type { SpeakingScenarioGroupId } from '@/lib/schemas/exam/speakingTrainingItem.schema'

const n = DEFAULT_SPEAKING_TRAINING_SESSION_SIZE
const estMin = Math.max(6, n * 4)

export function SpeakingSessionIntroCard({ onPickGroup }: { onPickGroup: (id: SpeakingScenarioGroupId) => void }) {
  const groups = defaultSpeakingTrainingScenarioOptions(n)

  return (
    <div className="space-y-4">
      <Card variant="outlined" padding="md" className="border-primary-200/50 bg-primary-50/30">
        <p className="text-caption font-semibold uppercase tracking-wide text-primary-900">Trainingssessie</p>
        <CardTitle className="mt-1 text-title font-bold text-ink-primary leading-snug">Kies je thema</CardTitle>
        <CardDescription className="mt-2 text-body text-ink-secondary leading-relaxed">
          {n} examengerichte vragen in één sessie. De moeilijkheid loopt rustig op (binnen A2). Reken op ongeveer{' '}
          {estMin} minuten.
        </CardDescription>
      </Card>

      <div className="space-y-2">
        {groups.map((id) => {
          const meta = SPEAKING_SCENARIO_GROUP_LABELS[id]
          return (
            <Card key={id} variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-body font-semibold text-ink-primary">{meta.titleNl}</p>
                  <p className="text-body-sm text-ink-secondary mt-0.5 leading-snug">{meta.subtitleNl}</p>
                </div>
                <Button
                  type="button"
                  className="w-full sm:w-auto shrink-0 min-h-touch px-5"
                  onClick={() => onPickGroup(id)}
                >
                  Start
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
