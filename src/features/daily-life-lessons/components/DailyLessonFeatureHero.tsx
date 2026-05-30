/**
 * FD-09 — intro hero: "Your day becomes your Dutch classroom."
 */

import { Sparkles } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'

interface DailyLessonFeatureHeroProps {
  onEnable: () => void
  onNotNow?: () => void
}

export function DailyLessonFeatureHero({ onEnable, onNotNow }: DailyLessonFeatureHeroProps) {
  return (
    <Card variant="outlined" padding="md" className="text-center">
      <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-7 h-7" aria-hidden />
      </div>
      <CardTitle className="text-title">Turn your real day into Dutch practice</CardTitle>
      <CardDescription className="mt-2 text-left">
        Capture places you visit, notes, or moments during the day. At the end of the day we generate a personalized lesson—phrases, vocabulary, and scenarios—based on what you actually did.
      </CardDescription>
      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={onEnable}
          className="min-h-touch px-4 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
        >
          Enable Daily Life Lessons
        </button>
        {onNotNow && (
          <button
            type="button"
            onClick={onNotNow}
            className="text-body-sm text-ink-secondary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
          >
            Not now
          </button>
        )}
      </div>
    </Card>
  )
}
