/**
 * FD-08 — CTA to start practice from a prompt.
 */

import { Mic } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ScenarioSceneVisual } from '@/components/visual/ScenarioSceneVisual'
import { tryResolveScenarioVisual } from '@/lib/visual/scenarioVisualRegistry'

interface QuickPracticeEntryCardProps {
  scenarioId: string
  scenarioTitle: string
  onStartPractice: () => void
  disabled?: boolean
}

export function QuickPracticeEntryCard({
  scenarioId,
  scenarioTitle,
  onStartPractice,
  disabled,
}: QuickPracticeEntryCardProps) {
  const scene = tryResolveScenarioVisual(scenarioId)
  return (
    <Card variant="outlined" padding="md" className="bg-primary-50/50 border-primary-100">
      <div className="flex items-center gap-3">
        {scene ? (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
            <ScenarioSceneVisual visual={scene} variant="square" fillSlot className="rounded-full" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink-primary">Practice this scenario</p>
          <p className="text-caption text-ink-secondary">{scenarioTitle}</p>
        </div>
        <Button
          size="sm"
          onClick={onStartPractice}
          disabled={disabled}
          aria-label={`Start practice: ${scenarioTitle}`}
          data-scenario-id={scenarioId}
        >
          Start
        </Button>
      </div>
    </Card>
  )
}
