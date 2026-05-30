import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Play, ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { MOCK_LISTENING_EXERCISES } from './mockExercises'

export function ListeningPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>()
  const router = useRouter()
  const exercise = exerciseId ? MOCK_LISTENING_EXERCISES.find((e) => e.id === exerciseId) : null
  const [playing, setPlaying] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const questions = [
    { id: 1, question: 'What did the person order?', options: ['Coffee', 'Tea', 'Water', 'Juice'], correct: 0 },
    { id: 2, question: 'How much did they pay?', options: ['€2', '€2.50', '€3', '€3.50'], correct: 1 },
  ]

  const score = submitted
    ? Object.entries(answers).filter(([i, a]) => questions[Number(i)]?.correct === a).length
    : null

  if (exerciseId && !exercise) {
    return (
      <div className="px-4 py-6 space-y-6">
        <p className="text-ink-secondary">Exercise not found.</p>
        <Button variant="ghost" onClick={() => router.push('/app/practice/listening')}>
          Back to listening
        </Button>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => router.push('/app/practice/listening')}>
        <ArrowLeft className="w-5 h-5 mr-1 inline" aria-hidden />
        Listening
      </Button>
      <h1 className="text-title font-bold text-ink-primary">{exercise?.title ?? 'Listening practice'}</h1>
      <Card variant="outlined" className="text-center py-8">
        <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
          <Button
            variant="ghost"
            className="w-20 h-20 rounded-full"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            <Play className={`w-10 h-10 text-primary-600 ${playing ? 'hidden' : ''}`} />
          </Button>
        </div>
        <p className="text-body-sm text-ink-secondary">Audio will play here. (Mock)</p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => setShowTranscript((s) => !s)}>
          {showTranscript ? 'Hide' : 'Show'} transcript
        </Button>
        {showTranscript && (
          <p className="mt-4 text-body text-ink-primary text-left bg-surface-muted p-3 rounded-lg">
            "Hallo, ik wil graag een koffie. Met melk alstublieft." — "Dat is €2,50."
          </p>
        )}
      </Card>
      <ProgressBar value={Object.keys(answers).length} max={questions.length} />
      <div className="space-y-4">
        {questions.map((q, i) => (
          <Card key={q.id} variant="outlined">
            <p className="font-medium text-ink-primary mb-3">{q.id}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => !submitted && setAnswers((a) => ({ ...a, [i]: j }))}
                  disabled={submitted}
                  className={`w-full min-h-touch px-4 rounded-lg border text-left font-medium ${
                    answers[i] === j ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-surface-elevated'
                  } ${submitted && j === q.correct ? 'border-success bg-success/10' : ''}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
      {!submitted ? (
        <Button fullWidth onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < questions.length}>
          Check answers
        </Button>
      ) : (
        <Card variant="outlined" className="bg-primary-50 border-primary-100">
          <p className="text-body font-semibold text-ink-primary">Score: {score}/{questions.length}</p>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => router.push('/app/practice/listening')}>Back to exercises</Button>
            <Button variant="ghost" onClick={() => router.push('/app/talk')}>Home</Button>
          </div>
        </Card>
      )}
    </div>
  )
}
