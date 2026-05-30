import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useStudyContextStore, type StudyCefrLevel } from '@/store/studyContextStore'
import { isCurriculumPathUiEnabled } from '@/config/curriculumFeature'
import { curriculumMockService } from '@/services/curriculumMockService'
import { useProductEntitlements } from '@/features/entitlements/useProductEntitlements'
import { syncSessionUserToLearnerProfile } from '@/lib/persistence'
import { mergeLearnerProfilePatch } from '@/lib/profile/profileActions'
import { useLearnerProfileStore } from '@/lib/profile/profileStore'
import { cefrFromLevelSelfReport } from '@/features/onboarding/onboardingOptions'
import { Card as PlanCard, CardTitle as PlanCardTitle, CardDescription as PlanCardDescription } from '@/components/ui/Card'

const LEVEL_OPTIONS = ['A0 (Beginner)', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const DAILY_GOAL_OPTIONS = [5, 10, 15, 20, 30]

const studyContextSchema = z.object({
  activeStudyLevel: z.enum(['A0', 'A1', 'A2', 'B1', 'B2', 'C1']),
  dailyLessonTarget: z.union([z.literal(1), z.literal(2), z.literal(3)]),
})

/** Map settings dropdown value → onboarding self-report id (keeps exam hub in sync). */
function selfReportIdFromSettingsLevel(label: string): string | undefined {
  if (!label.trim()) return undefined
  if (label.startsWith('A0')) return 'beginner'
  if (label === 'A1') return 'a1'
  if (label === 'A2') return 'a2'
  if (label === 'B1') return 'between_a2_b1'
  if (label === 'B2' || label === 'C1' || label === 'C2') return 'between_a2_b1'
  return undefined
}

const STUDY_LEVEL_SELECT: { value: StudyCefrLevel; label: string }[] = [
  { value: 'A0', label: 'A0' },
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'C1', label: 'C1' },
]

export function ProfileSettingsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, updateProfile } = useAuthStore()
  const profileDoc = useLearnerProfileStore((s) => s.document)
  const profileStatus = useLearnerProfileStore((s) => s.status)
  const { planLabel, isPremiumPlan } = useProductEntitlements()
  const activeStudyLevel = useStudyContextStore((s) => s.activeStudyLevel)
  const dailyLessonTarget = useStudyContextStore((s) => s.dailyLessonTarget)
  const setActiveStudyLevel = useStudyContextStore((s) => s.setActiveStudyLevel)
  const setDailyLessonTarget = useStudyContextStore((s) => s.setDailyLessonTarget)

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [currentLevel, setCurrentLevel] = useState(
    () => user?.currentLevel || profileDoc?.currentLevel || '',
  )

  useEffect(() => {
    if (profileStatus !== 'ready' || !profileDoc) return
    const fromProfile = profileDoc.currentLevel?.trim()
    if (fromProfile) setCurrentLevel(fromProfile)
  }, [profileStatus, profileDoc?.currentLevel, profileDoc?.userId])
  const [dailyGoal, setDailyGoal] = useState(user?.dailyLearningGoalMinutes ?? 10)
  const [studyLevel, setStudyLevel] = useState<StudyCefrLevel>(activeStudyLevel)
  const [lessonsPerDay, setLessonsPerDay] = useState<1 | 2 | 3>(dailyLessonTarget)
  const [studyError, setStudyError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setStudyError(null)
    const parsed = studyContextSchema.safeParse({
      activeStudyLevel: studyLevel,
      dailyLessonTarget: lessonsPerDay,
    })
    if (!parsed.success) {
      setStudyError(parsed.error.issues.map((e) => e.message).join(' '))
      return
    }

    setSaving(true)
    try {
      if (isCurriculumPathUiEnabled()) {
        setActiveStudyLevel(parsed.data.activeStudyLevel)
        setDailyLessonTarget(parsed.data.dailyLessonTarget)
        await curriculumMockService.saveStudyContext({
          activeCefrLevel: parsed.data.activeStudyLevel,
          dailyLessonTarget: parsed.data.dailyLessonTarget,
        })
        await queryClient.invalidateQueries({ queryKey: ['curriculum'] })
      }
      updateProfile({
        name,
        email,
        currentLevel: currentLevel || undefined,
        dailyLearningGoalMinutes: dailyGoal,
      })
      const u = useAuthStore.getState().user
      if (u) {
        const selfReportId = selfReportIdFromSettingsLevel(currentLevel)
        syncSessionUserToLearnerProfile(u.id, u)
        if (selfReportId) {
          const mapped = cefrFromLevelSelfReport(selfReportId)
          mergeLearnerProfilePatch(u.id, {
            currentLevel: currentLevel || mapped,
            currentLevelSelfReportId: selfReportId,
          })
        }
      }
      router.push('/app/settings')
    } catch {
      setStudyError('Could not save study settings. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-title font-bold text-ink-primary">Edit profile</h1>
      <PlanCard variant="flat" padding="sm" className="border border-slate-200 bg-surface-muted/40">
        <PlanCardTitle className="text-body-sm">Plan</PlanCardTitle>
        <PlanCardDescription className="text-body-sm mt-1">
          {planLabel} — {isPremiumPlan ? 'full product access for this beta account.' : 'core lessons & practice; Premium areas show a clear lock.'}
        </PlanCardDescription>
      </PlanCard>
      <Card variant="outlined">
        <CardTitle>Name</CardTitle>
        <CardDescription>Display name used in the app.</CardDescription>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="mt-2"
          aria-label="Name"
        />
      </Card>
      <Card variant="outlined">
        <CardTitle>Email</CardTitle>
        <CardDescription>Used for account and notifications.</CardDescription>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-2"
          aria-label="Email"
        />
      </Card>
      <Card variant="outlined">
        <CardTitle>Dutch level</CardTitle>
        <CardDescription>Your current level (used for recommendations).</CardDescription>
        <select
          value={currentLevel}
          onChange={(e) => setCurrentLevel(e.target.value)}
          className="mt-2 w-full min-h-touch px-4 rounded-lg border border-slate-300 bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500 text-ink-primary"
          aria-label="Current level"
        >
          <option value="">Select level</option>
          {LEVEL_OPTIONS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </Card>
      <Card variant="outlined">
        <CardTitle>Daily goal (minutes)</CardTitle>
        <CardDescription>Target practice time per day.</CardDescription>
        <select
          value={dailyGoal}
          onChange={(e) => setDailyGoal(Number(e.target.value))}
          className="mt-2 w-full min-h-touch px-4 rounded-lg border border-slate-300 bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500 text-ink-primary"
          aria-label="Daily goal"
        >
          {DAILY_GOAL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m} min
            </option>
          ))}
        </select>
      </Card>

      {isCurriculumPathUiEnabled() && (
        <Card variant="outlined">
          <CardTitle>Study path level</CardTitle>
          <CardDescription>
            The CEFR level for your <strong>ordered path</strong> and Today’s plan. You can keep your profile level above for recommendations.
          </CardDescription>
          <select
            value={studyLevel}
            onChange={(e) => setStudyLevel(e.target.value as StudyCefrLevel)}
            className="mt-2 w-full min-h-touch px-4 rounded-lg border border-slate-300 bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500 text-ink-primary"
            aria-label="Active study level for path"
          >
            {STUDY_LEVEL_SELECT.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <CardTitle className="mt-4 text-body">Lessons per day (Today)</CardTitle>
          <CardDescription>How many path lessons to show on Home.</CardDescription>
          <select
            value={lessonsPerDay}
            onChange={(e) => setLessonsPerDay(Number(e.target.value) as 1 | 2 | 3)}
            className="mt-2 w-full min-h-touch px-4 rounded-lg border border-slate-300 bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500 text-ink-primary"
            aria-label="Daily lesson target"
          >
            <option value={1}>1 lesson</option>
            <option value={2}>2 lessons</option>
            <option value={3}>3 lessons</option>
          </select>
          {studyError && <p className="text-body-sm text-error mt-2">{studyError}</p>}
        </Card>
      )}

      <Button fullWidth onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <Button variant="ghost" fullWidth onClick={() => router.push('/app/settings')}>
        Cancel
      </Button>
    </div>
  )
}
