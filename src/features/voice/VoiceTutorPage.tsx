import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Mic, MicOff, Volume2, AlertTriangle } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PermissionGate } from '@/components/ui/PermissionGate'
import { PremiumLock } from '@/components/premium/PremiumLock'
import { MOCK_SCENARIOS } from '@/mocks/scenarios'
import { usePremiumStore } from '@/store/premiumStore'

const MIC_SUPPORTED = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

export function VoiceTutorPage() {
  const { scenarioId } = useParams()
  const router = useRouter()
  const isPremium = usePremiumStore((s) => s.isPremium)
  const [micGranted, setMicGranted] = useState(false)
  const [micDenied, setMicDenied] = useState(false)
  const [recording, setRecording] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript] = useState('')
  const scenario = scenarioId ? MOCK_SCENARIOS.find((s) => s.id === scenarioId) : MOCK_SCENARIOS[0]

  const handleRequestMic = () => {
    if (!MIC_SUPPORTED) return
    setMicDenied(false)
    navigator.mediaDevices!
      .getUserMedia({ audio: true })
      .then(() => setMicGranted(true))
      .catch(() => setMicDenied(true))
  }

  if (!MIC_SUPPORTED) {
    return (
      <div className="p-4">
        <Card variant="outlined" className="border-warning/50 bg-warning/5">
          <div className="flex gap-3">
            <AlertTriangle className="w-10 h-10 text-warning shrink-0" aria-hidden />
            <div>
              <CardTitle>Unsupported browser</CardTitle>
              <CardDescription className="mt-1">
                Voice practice needs a browser that supports microphone access (e.g. Chrome or Safari on mobile). Try on a different device or use the text simulation instead.
              </CardDescription>
              <Button variant="secondary" className="mt-4" onClick={() => router.push('/app/practice/simulation')}>
                Use text simulation
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!isPremium) {
    return (
      <div className="p-4">
        <PremiumLock featureName="Voice tutor" variant="card" />
        <div className="mt-4">
          <p className="text-body-sm text-ink-secondary mb-2">Choose a scenario to try (Premium):</p>
          <div className="space-y-2">
            {MOCK_SCENARIOS.map((s) => (
              <Button key={s.id} variant="secondary" fullWidth onClick={() => router.push(`/app/practice/voice/${s.id}`)}>
                {s.title}
              </Button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!micGranted && !micDenied) {
    return (
      <div className="p-4">
        <PermissionGate
          type="microphone"
          granted={false}
          onRequest={handleRequestMic}
          onFallback={() => router.push('/app/practice/simulation')}
          fallbackMessage="Use text simulation instead"
        >
          <div />
        </PermissionGate>
      </div>
    )
  }

  if (micDenied) {
    return (
      <div className="p-4">
        <Card variant="outlined" className="border-error/30 bg-error/5">
          <div className="flex gap-3">
            <MicOff className="w-10 h-10 text-error shrink-0" aria-hidden />
            <div>
              <CardTitle>Microphone access denied</CardTitle>
              <CardDescription className="mt-1">
                You can enable it in your browser settings and then retry, or use text simulation for now.
              </CardDescription>
              <div className="mt-4 flex gap-2">
                <Button onClick={handleRequestMic}>Try again</Button>
                <Button variant="secondary" onClick={() => router.push('/app/practice/simulation')}>
                  Use text simulation
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {scenario && (
        <Card variant="outlined">
          <CardTitle>{scenario.title}</CardTitle>
          <CardDescription>{scenario.description}</CardDescription>
        </Card>
      )}
      <Card variant="outlined" className="text-center py-8">
        <div
          className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-colors ${
            recording ? 'bg-error/20 text-error' : listening ? 'bg-primary-100 text-primary-600' : 'bg-surface-muted text-ink-tertiary'
          }`}
        >
          {recording ? <MicOff className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
        </div>
        <p className="mt-4 font-medium text-ink-primary">
          {recording ? 'Recording...' : listening ? 'Listening...' : 'Tap to speak'}
        </p>
        <Button
          size="lg"
          className="mt-4"
          variant={recording ? 'danger' : 'primary'}
          onClick={() => { setRecording((r) => !r); if (!recording) setListening(false) }}
        >
          {recording ? 'Stop' : 'Start speaking'}
        </Button>
      </Card>
      {transcript && (
        <Card variant="flat" className="bg-surface-muted">
          <p className="text-body-sm text-ink-secondary mb-1">Transcript</p>
          <p className="text-body text-ink-primary">{transcript || 'Your speech will appear here.'}</p>
        </Card>
      )}
      <Card variant="outlined">
        <div className="flex items-center gap-2 text-ink-secondary">
          <Volume2 className="w-5 h-5" />
          <span className="text-body-sm">AI response will play here. (Mock)</span>
        </div>
      </Card>
      <Button variant="ghost" onClick={() => router.push('/app/practice/pronunciation-feedback')}>
        See pronunciation feedback
      </Button>
    </div>
  )
}
