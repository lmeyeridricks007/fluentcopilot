import { useRouter } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'

export function PronunciationFeedbackPage() {
  const router = useRouter()
  const score = 78
  const breakdown = [
    { label: 'Accuracy', value: 82 },
    { label: 'Fluency', value: 75 },
    { label: 'Completeness', value: 90 },
  ]
  const tips = ['Stress the first syllable in "lopen": LO-pen.', 'Try to keep a steady pace.']

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-title font-bold text-ink-primary">Pronunciation feedback</h1>
      <Card variant="outlined" className="text-center py-6">
        <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
          <TrendingUp className="w-10 h-10 text-primary-600" aria-hidden />
        </div>
        <p className="text-display font-bold text-ink-primary">{score}%</p>
        <p className="text-body-sm text-ink-secondary">Overall score</p>
      </Card>
      <Card variant="outlined">
        <CardTitle>Breakdown</CardTitle>
        <div className="mt-3 space-y-3">
          {breakdown.map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-body-sm mb-1">
                <span className="text-ink-secondary">{b.label}</span>
                <span className="font-medium text-ink-primary">{b.value}%</span>
              </div>
              <ProgressBar value={b.value} max={100} variant="default" />
            </div>
          ))}
        </div>
      </Card>
      <Card variant="outlined">
        <CardTitle>Tips to improve</CardTitle>
        <ul className="mt-2 space-y-2">
          {tips.map((t, i) => (
            <li key={i} className="flex gap-2 text-body-sm text-ink-primary">
              <span className="text-primary-600 shrink-0">•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Button fullWidth onClick={() => router.push('/app/practice/voice')}>
        Try again
      </Button>
      <Button variant="ghost" fullWidth onClick={() => router.push('/app/talk')}>
        Back to home
      </Button>
    </div>
  )
}
