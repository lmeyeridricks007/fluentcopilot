/**
 * FD-08 — premium gate for advanced/live Smart Prompts.
 */

import { Crown } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface PremiumSmartPromptGateProps {
  onUpgrade: () => void
  message?: string
}

export function PremiumSmartPromptGate({
  onUpgrade,
  message = 'Unlock live Smart Prompts and practice for every situation with Premium.',
}: PremiumSmartPromptGateProps) {
  return (
    <Card variant="elevated" className="bg-primary-50 border border-primary-100">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
          <Crown className="w-5 h-5" aria-hidden />
        </div>
        <div>
          <CardTitle className="text-body">Premium Smart Prompts</CardTitle>
          <CardDescription className="mt-1">{message}</CardDescription>
          <Button size="sm" className="mt-3" onClick={onUpgrade}>
            Upgrade to Premium
          </Button>
        </div>
      </div>
    </Card>
  )
}
