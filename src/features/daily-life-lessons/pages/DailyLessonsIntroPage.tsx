/**
 * FD-09 — intro / education for Daily Life Lessons.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Coffee, ShoppingCart, Train } from 'lucide-react'
import { DailyLessonFeatureHero } from '../components/DailyLessonFeatureHero'
import { DailyLessonPrivacyNotice } from '../components/DailyLessonPrivacyNotice'
import { PremiumDailyLessonGate } from '../components/PremiumDailyLessonGate'
import { useDailyLessonPreferencesStore } from '../store/dailyLessonPreferencesStore'
import { usePremiumStore } from '@/store/premiumStore'
import { track } from '@/lib/analytics'

export function DailyLessonsIntroPage() {
  const router = useRouter()
  const setEnabled = useDailyLessonPreferencesStore((s) => s.setEnabled)
  const isPremium = usePremiumStore((s) => s.isPremium)

  useEffect(() => {
    track('daily_lesson_intro_viewed' as const)
  }, [])

  const handleEnable = () => {
    track('daily_lesson_enable_clicked' as const)
    setEnabled(true)
    router.push('/app/daily-lessons')
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-title font-bold text-ink-primary">Daily Life Lessons</h1>
      <p className="text-body text-ink-secondary">
        Your day becomes your Dutch classroom. Capture what you do—we turn it into a personalized lesson.
      </p>

      <section>
        <h2 className="text-body-lg font-semibold text-ink-primary mb-2">How it works</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <Coffee className="w-5 h-5 text-primary-600" aria-hidden />
            </div>
            <div>
              <p className="font-medium text-ink-primary">Capture your day</p>
              <p className="text-caption text-ink-secondary">Places, notes, or manual moments</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5 text-primary-600" aria-hidden />
            </div>
            <div>
              <p className="font-medium text-ink-primary">We generate a lesson</p>
              <p className="text-caption text-ink-secondary">Phrases, vocabulary, scenarios from your activities</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <Train className="w-5 h-5 text-primary-600" aria-hidden />
            </div>
            <div>
              <p className="font-medium text-ink-primary">Practice</p>
              <p className="text-caption text-ink-secondary">Quiz, roleplay, pronunciation—all from your day</p>
            </div>
          </div>
        </div>
      </section>

      <DailyLessonFeatureHero onEnable={handleEnable} onNotNow={() => router.push('/app/talk')} />
      <DailyLessonPrivacyNotice />

      {!isPremium && (
        <PremiumDailyLessonGate
          onUpgrade={() => {
            track('daily_lesson_premium_cta_clicked' as const)
            router.push('/app/premium')
          }}
        />
      )}
    </div>
  )
}
