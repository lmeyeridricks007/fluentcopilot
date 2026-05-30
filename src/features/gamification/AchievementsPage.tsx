import { Trophy, Star, Target, MessageCircle, Flame, type LucideIcon } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { MOCK_ACHIEVEMENTS } from '@/mocks/achievements'

const ICON_MAP: Record<string, LucideIcon> = {
  star: Star,
  trophy: Trophy,
  target: Target,
  'message-circle': MessageCircle,
  flame: Flame,
}

export function AchievementsPage() {
  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-title font-bold text-ink-primary">Achievements</h1>
      <div className="grid grid-cols-2 gap-3">
        {MOCK_ACHIEVEMENTS.map((b) => {
          const Icon = ICON_MAP[b.iconId] ?? Star
          return (
            <Card
              key={b.id}
              variant="outlined"
              padding="md"
              className={`text-center ${!b.earned ? 'opacity-60' : ''}`}
            >
              <div
                className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-2 ${
                  b.earned ? 'bg-primary-100 text-primary-600' : 'bg-surface-muted text-ink-tertiary'
                }`}
              >
                <Icon className="w-6 h-6" aria-hidden />
              </div>
              <CardTitle className="text-body-sm">{b.name}</CardTitle>
              <CardDescription className="text-caption">{b.description}</CardDescription>
            </Card>
          )
        })}
      </div>
      <Card variant="flat" className="bg-surface-muted">
        <CardTitle className="text-body">Leaderboard</CardTitle>
        <CardDescription>Compare with friends (coming soon).</CardDescription>
      </Card>
    </div>
  )
}
