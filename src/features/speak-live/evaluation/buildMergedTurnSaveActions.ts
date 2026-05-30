import type { SaveActionItem } from './SaveForLaterActions'

function inferTagFromImprovementType(t: string): string | undefined {
  switch (t) {
    case 'save_phrase':
      return 'library'
    case 'save_pronunciation_word':
      return 'pronunciation_drill'
    case 'save_rhythm_drill':
      return 'rhythm_drill'
    case 'save_natural_phrasing':
      return 'phrasing_upgrade'
    case 'scenario_follow_up':
      return 'coach_follow_up'
    case 'sentence_drill':
      return 'review_queue'
    case 'review_queue':
      return 'review_queue'
    default:
      return undefined
  }
}

/**
 * Merge coach-suggested saves with canonical FluentCopilot rails (library, drills, review, coach).
 * One action per `type` so the row stays a single practice object without duplicate chips.
 */
export function buildMergedTurnSaveActions(
  llmActions: Array<{ type?: string; title?: string; detail?: string; targetWord?: string; targetPhrase?: string }>,
  ctx: { turnId: string; transcript: string; improved: string; focusWords: string[] }
): SaveActionItem[] {
  const typesSeen = new Set<string>()
  const out: SaveActionItem[] = []

  const push = (a: SaveActionItem) => {
    if (typesSeen.has(a.type)) return
    typesSeen.add(a.type)
    out.push(a)
  }

  for (const a of llmActions) {
    const t = (a.type ?? '').trim()
    if (!t) continue
    const title = (a.title ?? t).trim()
    const saveKey = `${ctx.turnId}::${t}::${title}`
    push({
      type: t,
      title: title || t,
      detail: a.detail?.trim(),
      saveKey,
      tagCategory: inferTagFromImprovementType(t),
    })
  }

  const difficultWord = ctx.focusWords[0]?.trim()
  const canonical: SaveActionItem[] = [
    {
      type: 'save_phrase',
      title: 'Save phrase to Library',
      saveKey: `${ctx.turnId}::canon::save_phrase`,
      tagCategory: 'library',
      suggestedTrainingMode: 'talk_focus',
    },
    {
      type: 'save_improved_version',
      title: 'Save improved version',
      saveKey: `${ctx.turnId}::canon::save_improved_version`,
      tagCategory: 'library',
      suggestedTrainingMode: 'read_aloud',
    },
    ...(difficultWord
      ? [
          {
            type: 'library_word',
            title: `Save difficult word: ${difficultWord}`,
            saveKey: `${ctx.turnId}::canon::library_word`,
            detail: difficultWord,
            tagCategory: 'library',
            suggestedTrainingMode: 'talk_focus',
          } satisfies SaveActionItem,
        ]
      : []),
    {
      type: 'sentence_drill',
      title: 'Practice this sentence later',
      saveKey: `${ctx.turnId}::canon::sentence_drill`,
      tagCategory: 'review_queue',
      suggestedTrainingMode: 'review_then_speak',
    },
    {
      type: 'pronunciation_drill',
      title: 'Add to pronunciation practice',
      saveKey: `${ctx.turnId}::canon::pronunciation_drill`,
      tagCategory: 'pronunciation_drill',
      suggestedTrainingMode: 'voice_session',
    },
    {
      type: 'rhythm_drill',
      title: 'Add to rhythm practice',
      saveKey: `${ctx.turnId}::canon::rhythm_drill`,
      tagCategory: 'rhythm_drill',
      suggestedTrainingMode: 'shadowing',
    },
    {
      type: 'natural_phrasing_drill',
      title: 'Add to natural phrasing practice',
      saveKey: `${ctx.turnId}::canon::natural_phrasing_drill`,
      tagCategory: 'phrasing_upgrade',
      suggestedTrainingMode: 'read_aloud',
    },
    {
      type: 'speaking_drill',
      title: 'Add to speaking drills',
      saveKey: `${ctx.turnId}::canon::speaking_drill`,
      tagCategory: 'speaking_drill',
      suggestedTrainingMode: 'voice_session',
    },
    {
      type: 'coach_followup',
      title: 'Send to Coach follow-up',
      saveKey: `${ctx.turnId}::canon::coach_followup`,
      tagCategory: 'coach_follow_up',
      suggestedTrainingMode: 'coach_card',
    },
  ]

  for (const c of canonical) {
    if (!typesSeen.has(c.type)) push(c)
  }

  return out
}
