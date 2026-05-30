import { clsx } from 'clsx'
import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'

const LABELS: Record<PracticeConversationMode, string> = {
  guided: 'Guided',
  semi_guided: 'Semi-guided',
  free: 'Free',
}

const STYLES: Record<PracticeConversationMode, string> = {
  guided: 'bg-primary-50 text-primary-800 border-primary-200',
  semi_guided: 'bg-amber-50 text-amber-900 border-amber-200',
  free: 'bg-slate-800 text-white border-slate-700',
}

export function ConversationModeBadge({ mode }: { mode: PracticeConversationMode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-caption font-semibold tracking-wide',
        STYLES[mode]
      )}
    >
      {LABELS[mode]}
    </span>
  )
}
