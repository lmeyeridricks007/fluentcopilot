/**
 * FD-08 — Smart Prompts feed (today’s and recent prompts).
 */

import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Settings } from 'lucide-react'
import { LocationPromptCard } from '../components/LocationPromptCard'
import { PromptEmptyState } from '../components/PromptEmptyState'
import { PromptLoadingState } from '../components/PromptLoadingState'
import { PromptDeniedState } from '../components/PromptDeniedState'
import { PromptUnsupportedState } from '../components/PromptUnsupportedState'
import { MOCK_LOCATION_PROMPTS } from '../mocks/prompts'
import { locationPromptService } from '../services/mockServices'
import { useLocationPermission } from '../hooks/useLocationPermission'
import { track } from '@/lib/analytics'
import { useLocationPromptPreferencesStore } from '../store/locationPromptPreferencesStore'

export function ContextPromptsFeedPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { status } = useLocationPermission()
  const enabled = useLocationPromptPreferencesStore((s) => s.enabled)

  const { data: prompts, isLoading, error } = useQuery({
    queryKey: ['location-prompts', 'feed'],
    queryFn: () => locationPromptService.getCurrentPromptFeed(),
  })

  const handleSave = async (promptId: string) => {
    await locationPromptService.savePrompt(promptId)
    track('smart_prompt_saved' as const, { promptId })
    queryClient.invalidateQueries({ queryKey: ['location-prompts'] })
  }

  const handleDismiss = async (promptId: string) => {
    await locationPromptService.dismissPrompt(promptId)
    track('smart_prompt_dismissed' as const, { promptId })
    queryClient.invalidateQueries({ queryKey: ['location-prompts'] })
  }

  if (status === 'denied') {
    return (
      <div className="px-4 py-6">
        <PromptDeniedState
          onOpenSettings={() => router.push('/app/context-prompts/settings')}
        />
      </div>
    )
  }

  if (status === 'unsupported') {
    return (
      <div className="px-4 py-6">
        <PromptUnsupportedState onOpenSettings={() => router.push('/app/context-prompts/settings')} />
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-title font-bold text-ink-primary">Smart Prompts</h1>
        <button
          type="button"
          onClick={() => router.push('/app/context-prompts/settings')}
          className="p-2 rounded-lg hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 text-ink-secondary" aria-hidden />
        </button>
      </div>

      {!enabled && (
        <p className="text-body-sm text-ink-secondary mb-4">
          Enable Smart Prompts in settings to see context-aware suggestions.
        </p>
      )}

      {isLoading && <PromptLoadingState />}
      {error && (
        <div className="py-8 text-center text-body-sm text-error">
          Something went wrong. Try again later.
        </div>
      )}
      {!isLoading && !error && prompts && prompts.length === 0 && (
        <PromptEmptyState
          onOpenSettings={() => router.push('/app/context-prompts/settings')}
          showSimulate
          onSimulate={() => {
            const first = MOCK_LOCATION_PROMPTS[0]
            if (first) router.push(`/app/context-prompts/${first.promptId}`)
          }}
        />
      )}
      {!isLoading && !error && prompts && prompts.length > 0 && (
        <div className="space-y-3">
          <p className="text-body-sm text-ink-secondary">Nearby and recent</p>
          {prompts.map((p) => (
            <LocationPromptCard
              key={p.promptId}
              prompt={p}
              onSave={handleSave}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </div>
  )
}
