/**
 * FD-08 — Single prompt detail (phrases, practice CTA, save/dismiss).
 */

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LocationPromptHeader } from '../components/LocationPromptHeader'
import { PhraseSuggestionList } from '../components/PhraseSuggestionList'
import { QuickPracticeEntryCard } from '../components/QuickPracticeEntryCard'
import { PremiumSmartPromptGate } from '../components/PremiumSmartPromptGate'
import { locationPromptService } from '../services/mockServices'
import { usePremiumStore } from '@/store/premiumStore'
import { track } from '@/lib/analytics'
import { getPracticeScenarioHref } from '@/lib/practice/getPracticeScenarioHref'

export function ContextPromptDetailPage() {
  const { promptId } = useParams<{ promptId: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const isPremium = usePremiumStore((s) => s.isPremium)

  const { data: prompt, isLoading, error } = useQuery({
    queryKey: ['location-prompts', promptId],
    queryFn: () => (promptId ? locationPromptService.getPromptById(promptId) : Promise.resolve(null)),
    enabled: !!promptId,
  })

  useEffect(() => {
    if (prompt?.promptId) track('smart_prompt_viewed' as const, { promptId: prompt.promptId, venueType: prompt.venueType })
  }, [prompt?.promptId, prompt?.venueType])

  const handleSave = async () => {
    if (!promptId) return
    await locationPromptService.savePrompt(promptId)
    queryClient.invalidateQueries({ queryKey: ['location-prompts'] })
  }

  const handleDismiss = async () => {
    if (!promptId) return
    await locationPromptService.dismissPrompt(promptId)
    queryClient.invalidateQueries({ queryKey: ['location-prompts'] })
    router.push('/app/context-prompts')
  }

  const handleStartPractice = () => {
    track('smart_prompt_practice_clicked' as const, { promptId, scenarioId: prompt?.scenarioId })
    const sid = prompt?.scenarioId
    if (sid) router.push(getPracticeScenarioHref(sid))
  }

  if (!promptId) {
    router.push('/app/context-prompts')
    return null
  }

  if (isLoading) {
    return (
      <div className="px-4 py-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/2 mb-4" />
        <div className="h-4 bg-slate-100 rounded w-full mb-2" />
        <div className="h-4 bg-slate-100 rounded w-3/4" />
      </div>
    )
  }

  if (error || !prompt) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-body text-ink-secondary">Prompt not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push('/app/context-prompts')}>
          Back to feed
        </Button>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-24">
      <LocationPromptHeader prompt={prompt} />

      <section className="mt-6">
        <h2 className="text-body-lg font-semibold text-ink-primary mb-2">Useful phrases</h2>
        <PhraseSuggestionList phrases={prompt.phrases} showFormality />
      </section>

      <section className="mt-6">
        <p className="text-caption text-ink-tertiary mb-2">Listen (placeholder)</p>
        <button
          type="button"
          className="flex items-center gap-2 text-body-sm text-primary-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
        >
          <Volume2 className="w-4 h-4" aria-hidden />
          Play pronunciation
        </button>
      </section>

      {prompt.quickPracticeAvailable && (
        <section className="mt-6">
          <QuickPracticeEntryCard
            scenarioId={prompt.scenarioId}
            scenarioTitle={prompt.scenarioTitle}
            onStartPractice={handleStartPractice}
          />
        </section>
      )}

      {prompt.isPremium && !isPremium && (
        <section className="mt-6">
          <PremiumSmartPromptGate onUpgrade={() => router.push('/app/premium')} />
        </section>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-elevated border-t border-slate-200 flex gap-2 safe-area-pb">
        {prompt.isSaved ? (
          <span className="flex items-center gap-2 text-body-sm text-primary-600 py-2">
            <Bookmark className="w-4 h-4 fill-current" aria-hidden /> Saved
          </span>
        ) : (
          <Button variant="secondary" onClick={handleSave} className="flex-1">
            Save
          </Button>
        )}
        <Button variant="ghost" onClick={handleDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}
