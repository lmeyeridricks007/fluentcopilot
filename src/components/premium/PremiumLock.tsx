import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'

interface PremiumLockProps {
  featureName: string
  variant?: 'inline' | 'card' | 'overlay'
  onUnlock?: () => void
}

export function PremiumLock({
  featureName,
  variant = 'card',
  onUnlock,
}: PremiumLockProps) {
  const router = useRouter()
  const handleUnlock = () => {
    if (onUnlock) onUnlock()
    else router.push('/app/premium')
  }

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleUnlock}
        className="inline-flex items-center gap-2 text-body-sm text-primary-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
      >
        <Lock className="w-4 h-4" aria-hidden />
        <span>Unlock with Premium</span>
      </button>
    )
  }

  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 bg-black/40 rounded-card flex items-center justify-center z-10">
        <Card className="mx-4 max-w-sm text-center">
          <Lock className="w-10 h-10 text-primary-600 mx-auto mb-2" aria-hidden />
          <CardTitle>{featureName} is Premium</CardTitle>
          <CardDescription>
            Upgrade to get full access to voice tutor, pronunciation feedback, and more.
          </CardDescription>
          <Button className="mt-4 w-full" onClick={handleUnlock}>
            View plans
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <Card variant="outlined" className="text-center">
      <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-3">
        <Lock className="w-6 h-6" aria-hidden />
      </div>
      <CardTitle>{featureName}</CardTitle>
      <CardDescription className="mt-1">
        Available with Premium. Unlock all lessons, voice practice, and exam prep.
      </CardDescription>
      <Button className="mt-4 w-full" onClick={handleUnlock}>
        Upgrade to Premium
      </Button>
    </Card>
  )
}
