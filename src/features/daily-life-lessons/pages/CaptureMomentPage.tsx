/**
 * FD-09 — capture moment flow.
 */

import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { CaptureMomentForm } from '../components/CaptureMomentForm'
import { dailyActivityService } from '../services/mockServices'
import { track } from '@/lib/analytics'
import type { CaptureMomentInput } from '../types'

export function CaptureMomentPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const handleSubmit = async (input: CaptureMomentInput) => {
    await dailyActivityService.captureMoment(input)
    track('daily_lesson_manual_capture_saved' as const)
    queryClient.invalidateQueries({ queryKey: ['daily-lessons'] })
    router.push('/app/daily-lessons')
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => router.push('/app/daily-lessons')}
          className="p-2 rounded-lg hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 text-ink-secondary"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-title font-bold text-ink-primary">Capture a moment</h1>
      </div>
      <CaptureMomentForm onSubmit={handleSubmit} onCancel={() => router.push('/app/daily-lessons')} />
    </div>
  )
}
