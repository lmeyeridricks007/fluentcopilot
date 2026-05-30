import { useRouter } from 'next/navigation'
import { Headphones, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { MOCK_LISTENING_EXERCISES } from './mockExercises'

export function ListeningCatalogPage() {
  const router = useRouter()

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-title font-bold text-ink-primary">Listening practice</h1>
      <p className="text-body-sm text-ink-secondary">
        Improve your listening with audio exercises. Choose an exercise to start.
      </p>
      <div className="space-y-2">
        {MOCK_LISTENING_EXERCISES.map((ex) => (
          <Card
            key={ex.id}
            variant="outlined"
            padding="md"
            className="flex items-center gap-3 cursor-pointer hover:bg-surface-muted transition-colors"
            onClick={() => router.push(`/app/practice/listening/${ex.id}`)}
          >
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5 text-primary-600" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink-primary">{ex.title}</p>
              <p className="text-caption text-ink-secondary">{ex.description}</p>
              <p className="text-caption text-ink-tertiary mt-0.5">{ex.level} · {ex.durationMinutes} min</p>
            </div>
            <ChevronRight className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
          </Card>
        ))}
      </div>
    </div>
  )
}
