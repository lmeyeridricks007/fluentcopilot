/**
 * FD-09 — premium gate for daily life lessons.
 */

import { Crown } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface PremiumDailyLessonGateProps {
  onUpgrade: () => void
  message?: string
}

export function PremiumDailyLessonGate({
  onUpgrade,
  message = 'Turn your real day into Dutch practice. Upgrade to generate personalized lessons from your daily activities.',
}: PremiumDailyLessonGateProps) {
  return (
    <Card variant="elevated" className="bg-primary-50 border border-primary-100">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
          <Crown className="w-5 h-5" aria-hidden />
        </div>
        <div>
          <CardTitle className="text-body">Daily Life Lessons</CardTitle>
          <CardDescription className="mt-1">{message}</CardDescription>
          <Button size="sm" className="mt-3" onClick={onUpgrade}>
            Upgrade to Premium
          </Button>
        </div>
      </div>
    </Card>
  )
}
