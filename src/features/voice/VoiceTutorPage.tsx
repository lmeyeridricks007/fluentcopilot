'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Mic } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PremiumLock } from '@/components/premium/PremiumLock'
import { MOCK_SCENARIOS } from '@/mocks/scenarios'
import { usePremiumStore } from '@/store/premiumStore'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import {
  VOICE_PRACTICE_FALLBACK_HREF,
  speakLiveHrefForAllVoicePracticeScenarios,
  speakLiveHrefForVoicePracticeScenario,
} from '@/features/voice/voicePracticeToSpeakLive'

function VoicePracticeBackendRequired({ onBack }: { onBack: () => void }) {
  return (
    <div className="px-4 py-8 space-y-4 text-center">
      <Card variant="outlined" className="text-left">
        <CardTitle>Voice practice needs the API</CardTitle>
        <CardDescription className="mt-2">
          This route uses the same Speak Live pipeline as Talk (real speech, assistant voice, and recap). The app
          build is missing a backend API URL.
        </CardDescription>
      </Card>
      <Button variant="secondary" onClick={onBack}>
        Back to Talk
      </Button>
    </div>
  )
}

function VoicePracticeRedirecting({ title }: { title?: string }) {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" aria-hidden />
      <p className="text-body font-medium text-ink-primary">Starting voice session…</p>
      {title ? <p className="text-body-sm text-ink-secondary">{title}</p> : null}
    </div>
  )
}

export function VoiceTutorPage() {
  const params = useParams()
  const router = useRouter()
  const isPremium = usePremiumStore((s) => s.isPremium)
  const backend = isFeature1ChatBackendEnabled()
  const demoScenarioId = typeof params?.scenarioId === 'string' ? params.scenarioId.trim() : ''
  const scenario = demoScenarioId ? MOCK_SCENARIOS.find((s) => s.id === demoScenarioId) : null
  const speakLiveHref = demoScenarioId ? speakLiveHrefForVoicePracticeScenario(demoScenarioId) : null

  useEffect(() => {
    if (!backend || !demoScenarioId) return
    const href = speakLiveHref ?? VOICE_PRACTICE_FALLBACK_HREF
    router.replace(href)
  }, [backend, demoScenarioId, speakLiveHref, router])

  if (!isPremium) {
    return (
      <div className="p-4">
        <PremiumLock featureName="Voice tutor" variant="card" />
        <div className="mt-4 space-y-2">
          <p className="text-body-sm text-ink-secondary mb-2">Choose a scenario (Premium):</p>
          {MOCK_SCENARIOS.map((s) => (
            <Button key={s.id} variant="secondary" fullWidth onClick={() => router.push(`/app/practice/voice/${s.id}`)}>
              {s.title}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  if (!backend) {
    return <VoicePracticeBackendRequired onBack={() => router.push('/app/talk')} />
  }

  if (demoScenarioId) {
    return <VoicePracticeRedirecting title={scenario?.title} />
  }

  const liveScenarios = speakLiveHrefForAllVoicePracticeScenarios()

  return (
    <div className="px-4 py-6 space-y-6">
      <Card variant="outlined">
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary-600" aria-hidden />
          Voice practice
        </CardTitle>
        <CardDescription className="mt-2">
          Real Speak Live sessions — tap a scene, hold or tap the mic, and get a voiced Dutch reply like our other
          simulations.
        </CardDescription>
      </Card>

      <div className="space-y-3">
        {liveScenarios.map((s) => (
          <button
            key={s.demoId}
            type="button"
            onClick={() => router.push(s.href)}
            className="w-full rounded-2xl border border-slate-200 bg-surface-elevated p-4 text-left shadow-card transition hover:border-primary-200 hover:bg-primary-50/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
          >
            <p className="font-semibold text-ink-primary">{s.title}</p>
            <p className="mt-1 text-body-sm text-ink-secondary">{s.description}</p>
          </button>
        ))}
      </div>

      <Button variant="ghost" fullWidth onClick={() => router.push(VOICE_PRACTICE_FALLBACK_HREF)}>
        Browse all Speak Live scenarios
      </Button>
    </div>
  )
}
