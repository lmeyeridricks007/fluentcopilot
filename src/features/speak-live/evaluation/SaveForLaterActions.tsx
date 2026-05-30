'use client'

export type SaveActionItem = {
  type: string
  title: string
  detail?: string
  /** Disambiguate identical titles across turns when tracking save-in-flight. */
  saveKey?: string
  /** FluentCopilot training rail — sent to API when saving. */
  tagCategory?: string
  suggestedTrainingMode?: string
}

export type SaveForLaterActionsProps = {
  actions: SaveActionItem[]
  savingKey: string | null
  onSave: (action: SaveActionItem) => void
}

/**
 * Per-turn training queue chips — each action is already specific from the API.
 */
export function SaveForLaterActions({ actions, savingKey, onSave }: SaveForLaterActionsProps) {
  if (!actions.length) return null
  return (
    <div>
      <p className="text-caption font-bold text-ink-primary mb-2">Save for later</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((act) => {
          const key = act.saveKey ?? `${act.type}-${act.title}`
          const busy = savingKey === key
          return (
            <button
              key={key}
              type="button"
              disabled={busy}
              onClick={() => onSave(act)}
              className="rounded-full border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold text-ink-primary hover:bg-slate-50 disabled:opacity-40 min-h-touch text-left max-w-full shadow-card"
            >
              {busy ? 'Saving…' : act.title}
            </button>
          )
        })}
      </div>
    </div>
  )
}
