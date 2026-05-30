import type { PostConversationFeedbackInput, SessionPerformanceSignals } from '@/lib/practice-feedback/types'
import type { NextPracticeSuggestion } from '@/lib/schemas/practice/practiceFeedback.schema'
import type { PracticeFeedbackCta } from '@/lib/practice-feedback/types'

export function buildNextPracticeSuggestion(
  signals: SessionPerformanceSignals,
  input: PostConversationFeedbackInput
): NextPracticeSuggestion {
  const sid = input.scenarioId
  if (signals.sessionOutcome === 'needs_practice' || signals.supportHeavy) {
    return {
      kind: 'scenario',
      targetId: sid,
      rationale: 'Run the same scene again — familiarity will lower stress.',
    }
  }
  if (input.mode === 'guided') {
    return {
      kind: 'scenario',
      targetId: sid,
      rationale: 'Try semi-guided next: same goal, more of your own wording.',
    }
  }
  if (input.mode === 'semi_guided') {
    return {
      kind: 'scenario',
      targetId: sid,
      rationale: 'When ready, free mode builds independence in the same setting.',
    }
  }
  return {
    kind: 'review',
    targetId: 'daily',
    rationale: 'Lock in phrases with a short review round while they’re fresh.',
  }
}

function pushSkillTrackCta(
  ctas: PracticeFeedbackCta[],
  id: string,
  label: string,
  trackId: string,
  variant: 'secondary' | 'ghost'
) {
  const href = `/app/practice/tracks/${encodeURIComponent(trackId)}`
  if (ctas.some((c) => c.href === href)) return
  ctas.push({ id, label, href, variant })
}

export function buildFeedbackCtas(
  next: NextPracticeSuggestion,
  input: PostConversationFeedbackInput,
  signals: SessionPerformanceSignals
): PracticeFeedbackCta[] {
  const sid = input.scenarioId
  const ctas: PracticeFeedbackCta[] = []
  const hasGuidedPrimary = Boolean(input.guidedOverlay?.nextActions?.[0])

  if (next.kind === 'scenario') {
    ctas.push({
      id: 'retry_scenario',
      label:
        input.mode === 'guided'
          ? 'Practice another mode'
          : input.mode === 'semi_guided'
            ? 'Try free conversation'
            : 'Run this scenario again',
      href: `/app/practice/scenario/${sid}`,
      variant: hasGuidedPrimary && input.mode === 'guided' ? 'secondary' : 'primary',
    })
  } else {
    ctas.push({
      id: 'next_practice',
      label: 'Open scenario hub',
      href: `/app/practice/scenario/${sid}`,
      variant: 'primary',
    })
  }

  ctas.push({
    id: 'review_from_practice',
    label: 'Do a quick review',
    href: '/app/review',
    variant: 'secondary',
  })

  if (input.mode === 'semi_guided') {
    ctas.push({
      id: 'harder_mode',
      label: 'Try free mode',
      href: `/app/practice/free/${encodeURIComponent(sid)}`,
      variant: 'ghost',
    })
  }
  if (input.mode === 'free') {
    ctas.push({
      id: 'semi_mode',
      label: 'Practice with lighter coaching',
      href: `/app/practice/semi/${encodeURIComponent(sid)}`,
      variant: 'ghost',
    })
  }

  if (signals.supportHeavy || signals.sessionOutcome === 'needs_practice') {
    pushSkillTrackCta(
      ctas,
      'skill_track_repair',
      'Reaction & repair drill',
      'conversation_repair',
      'secondary'
    )
  }
  if (signals.englishTokensDetected && signals.sessionOutcome !== 'success') {
    pushSkillTrackCta(ctas, 'skill_track_speaking', 'Speaking fluency (2–4 min)', 'speaking_fluency', 'ghost')
  }
  if (signals.missedKeyPhrases.length >= 2) {
    pushSkillTrackCta(ctas, 'skill_track_listening', 'Listening confidence', 'listening_confidence', 'ghost')
  }
  if (signals.wordOrderRisk) {
    pushSkillTrackCta(ctas, 'skill_track_writing', 'Write short messages', 'writing_messages', 'ghost')
  }

  if (!ctas.some((c) => c.href === '/app/practice/tracks')) {
    ctas.push({
      id: 'skill_tracks_hub',
      label: 'All skill tracks',
      href: '/app/practice/tracks',
      variant: 'ghost',
    })
  }

  ctas.push({
    id: 'library',
    label: 'Scenario library',
    href: '/app/practice/scenarios',
    variant: 'ghost',
  })

  const guidedNext = input.guidedOverlay?.nextActions?.[0]
  if (guidedNext && input.mode === 'guided') {
    ctas.unshift({
      id: 'guided_next',
      label: guidedNext.label,
      href: guidedNext.href,
      variant: guidedNext.variant === 'primary' ? 'primary' : 'secondary',
    })
  }

  return ctas
}
