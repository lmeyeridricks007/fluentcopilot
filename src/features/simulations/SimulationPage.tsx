import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Send, Bot, User, MessageCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MOCK_SCENARIOS } from '@/mocks/scenarios'
import { useEntitlement, PaywallModal } from '@/features/entitlements'
import { setLastPracticeContinue } from '@/features/practice-hub'
import { getScenarioCatalogEntries } from '@/lib/practice/scenarioCatalog'
import { scenarioCatalogCategorySchema } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function SimulationPage() {
  const { scenarioId } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')
  const scenarioList = useMemo(() => {
    const parsed = categoryParam ? scenarioCatalogCategorySchema.safeParse(categoryParam) : null
    if (!parsed?.success) return MOCK_SCENARIOS
    const ids = new Set(
      getScenarioCatalogEntries()
        .filter((e) => e.category === parsed.data)
        .map((e) => e.id)
    )
    const filtered = MOCK_SCENARIOS.filter((s) => ids.has(s.id))
    return filtered.length > 0 ? filtered : MOCK_SCENARIOS
  }, [categoryParam])
  const { canStartScenario, atScenarioCap, usage } = useEntitlement()
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: 'Hallo! Welkom bij het café. Wat wilt u bestellen?' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [coachingOpen, setCoachingOpen] = useState(false)
  const [lastCorrection, setLastCorrection] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const scenario = scenarioId
    ? MOCK_SCENARIOS.find((s) => s.id === scenarioId)
    : MOCK_SCENARIOS[0]

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight)
  }, [messages])

  useEffect(() => {
    if (!scenarioId || !scenario) return
    setLastPracticeContinue({
      scenarioId: String(scenarioId),
      title: scenario.title,
      mode: 'free',
      updatedAt: new Date().toISOString(),
    })
  }, [scenarioId, scenario])

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages((m) => [...m, { id: Date.now().toString(), role: 'user', content: text }])
    setLoading(true)
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Graag! Dat is €2,50. Wilt u er iets bij?',
        },
      ])
      setLastCorrection("You could say: \"Ik wil graag een koffie\" — the polite form with 'graag' is common in Dutch.")
      setCoachingOpen(true)
      setLoading(false)
    }, 800)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {!scenarioId && (
        <div className="px-4 py-3 border-b border-slate-200 bg-surface-muted">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-body-sm font-medium text-ink-secondary">Choose a scenario</p>
            <Link
              href="/app/practice"
              className="text-caption font-medium text-primary-600 hover:underline shrink-0"
            >
              ← Practice hub
            </Link>
          </div>
          {categoryParam ? (
            <p className="text-caption text-ink-tertiary mb-2">
              Filtered by category ·{' '}
              <Link href="/app/practice/simulation" className="text-primary-600 font-medium">
                Show all
              </Link>
            </p>
          ) : null}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {scenarioList.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (!canStartScenario && atScenarioCap) {
                    setPaywallOpen(true)
                    return
                  }
                  router.push(`/app/practice/simulation/${s.id}`)
                }}
                className="shrink-0 px-4 py-2 rounded-lg border border-slate-200 bg-surface-elevated text-body-sm font-medium"
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      )}
      {scenario && (
        <div className="px-4 py-2 border-b border-slate-200">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-body font-semibold text-ink-primary">{scenario.title}</h2>
              <p className="text-caption text-ink-secondary">{scenario.description}</p>
            </div>
            <Link
              href="/app/practice"
              className="text-caption font-medium text-primary-600 hover:underline shrink-0 pt-0.5"
            >
              Hub
            </Link>
          </div>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-primary-100 text-primary-600' : 'bg-slate-200 text-ink-secondary'
                }`}
              >
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <Card
                variant="flat"
                className={`max-w-[85%] p-3 ${
                  msg.role === 'user' ? 'bg-primary-100 text-ink-primary' : 'bg-surface-muted'
                }`}
              >
                <p className="text-body">{msg.content}</p>
              </Card>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-ink-secondary" />
              </div>
              <Card variant="flat" className="p-3 bg-surface-muted">
                <span className="inline-block w-2 h-2 rounded-full bg-ink-tertiary animate-pulse" />
              </Card>
            </div>
          )}
        </div>

        {/* Correction / coaching panel */}
        <div
          className={`border-l border-slate-200 bg-surface-muted flex flex-col transition-[width] overflow-hidden ${
            coachingOpen ? 'w-full max-w-sm' : 'w-0 max-w-0'
          }`}
        >
          <div className="p-3 border-b border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-body-sm font-semibold text-ink-primary flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary-600" aria-hidden />
              Tip
            </span>
            <button
              type="button"
              onClick={() => setCoachingOpen(false)}
              className="p-1 rounded hover:bg-slate-200 text-ink-secondary"
              aria-label="Close tip panel"
            >
              ×
            </button>
          </div>
          <div className="p-3 overflow-auto flex-1">
            {lastCorrection && (
              <p className="text-body-sm text-ink-primary">{lastCorrection}</p>
            )}
            {!lastCorrection && (
              <p className="text-body-sm text-ink-secondary">Corrections and tips will appear here after you send a message.</p>
            )}
          </div>
        </div>
      </div>

      {lastCorrection && !coachingOpen && (
        <div className="px-4 py-2 border-t border-slate-200 bg-primary-50/50">
          <button
            type="button"
            onClick={() => setCoachingOpen(true)}
            className="text-body-sm font-medium text-primary-700 flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" aria-hidden />
            View tip
          </button>
        </div>
      )}

      <div className="p-4 border-t border-slate-200 bg-surface-elevated safe-area-pb">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type in Dutch..."
            className="flex-1 min-h-touch px-4 rounded-lg border border-slate-300 bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Message"
          />
          <Button onClick={handleSend} disabled={!input.trim() || loading} aria-label="Send">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        reason="scenario_cap"
        usage={{ used: usage.scenariosToday, limit: usage.scenariosLimit }}
      />
    </div>
  )
}
