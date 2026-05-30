import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ImagePlus } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function ReflectionPage() {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [generated, setGenerated] = useState(false)

  const handleGenerate = () => {
    setGenerated(true)
  }

  if (generated) {
    return (
      <div className="px-4 py-6 space-y-6">
        <Card variant="outlined" className="text-center py-6">
          <Sparkles className="w-12 h-12 text-primary-600 mx-auto mb-3" aria-hidden />
          <CardTitle>Lesson generated</CardTitle>
          <CardDescription className="mt-1">
            We've created a short lesson based on your reflection. Practice the vocabulary and phrases you might use.
          </CardDescription>
          <Button className="mt-4" onClick={() => router.push('/app/learn/reflection-1')}>
            Start lesson
          </Button>
        </Card>
        <Button variant="ghost" fullWidth onClick={() => { setGenerated(false); setNote('') }}>
          Add another reflection
        </Button>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-title font-bold text-ink-primary">Daily reflection</h1>
      <Card variant="outlined">
        <CardTitle>What happened today?</CardTitle>
        <CardDescription>
          Add a moment from your day—a conversation, a visit, or something you did. We'll turn it into a short lesson.
        </CardDescription>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. I went to the supermarket and asked where the milk was..."
          className="mt-4 w-full min-h-[120px] px-3 py-2 rounded-lg border border-slate-300 bg-surface-elevated text-body focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Reflection note"
        />
        <Button variant="secondary" size="sm" className="mt-2" disabled aria-label="Add photo (coming soon)">
          <ImagePlus className="w-4 h-4 mr-2 inline" />
          Add photo (optional)
        </Button>
      </Card>
      <p className="text-caption text-ink-tertiary">
        Your reflections are private and used only to generate personal lessons. We don't share this data.
      </p>
      <Button fullWidth onClick={handleGenerate} disabled={!note.trim()}>
        Generate lesson
      </Button>
    </div>
  )
}
