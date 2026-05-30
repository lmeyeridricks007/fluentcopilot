import type { SupportToolId } from '@/lib/practice-support/types'
import type { OpenSupportContext, OpenSupportResult } from '@/lib/practice-support/types'
import {
  buildContextualMeaningEn,
  buildKeyPhraseTranslation,
  buildNaturalizedDutchSuggestion,
  buildOpenPracticeHint,
  buildSimplerAssistantReplay,
  stepEasierDifficulty,
} from '@/lib/practice-orchestration/supportResponses'

function lastAssistant(ctx: OpenSupportContext): { id: string; content: string } | null {
  for (let i = ctx.messages.length - 1; i >= 0; i--) {
    const m = ctx.messages[i]!
    if (m.role === 'assistant') return { id: m.id, content: m.content }
  }
  return null
}

function priorUserTurns(ctx: OpenSupportContext): number {
  return ctx.messages.filter((m) => m.role === 'user').length
}

/**
 * Executes a support tool for open / semi-guided practice.
 * UI applies message mutations and session flags from the result.
 */
export function runOpenSupportTool(
  tool: SupportToolId,
  ctx: OpenSupportContext
): OpenSupportResult | null {
  const assistant = lastAssistant(ctx)
  const userTurns = priorUserTurns(ctx)

  switch (tool) {
    case 'hint': {
      const depth = ctx.hintUseCount >= 1 ? 'deeper' : 'light'
      return {
        kind: 'hint',
        text: buildOpenPracticeHint({
          mode: ctx.mode,
          scenarioGoal: ctx.scenarioGoal,
          priorUserTurns: userTurns,
          supportDepth: depth,
        }),
      }
    }
    case 'phrase_suggestions': {
      const fromScenario = ctx.keyPhrases.map((p) => p.phrase).filter(Boolean)
      const generic = [
        'Mag ik …?',
        'Ik heb … nodig.',
        'Kunt u dat herhalen?',
        'Ik begrijp het niet.',
        'Een ogenblik, alstublieft.',
      ]
      const merged = [...new Set([...fromScenario, ...generic])].slice(0, 8)
      return { kind: 'phrase_suggestions', phrases: merged }
    }
    case 'slower_reply': {
      if (!assistant) return null
      return {
        kind: 'slower_reply',
        assistantNl: buildSimplerAssistantReplay(assistant.content),
        translationEn: 'Simpler replay of the last Dutch line (orchestration: A2-lower polish).',
      }
    }
    case 'translate_key_phrase': {
      if (!assistant) return null
      const { chunkNl, glossEn } = buildKeyPhraseTranslation(assistant.content, ctx.keyPhrases)
      return {
        kind: 'translate_key_phrase',
        messageId: assistant.id,
        chunkNl,
        glossEn,
      }
    }
    case 'what_means': {
      if (!assistant) return null
      return {
        kind: 'what_means',
        messageId: assistant.id,
        explanationEn: buildContextualMeaningEn(assistant.content, ctx.scenarioGoal),
      }
    }
    case 'say_naturally': {
      return {
        kind: 'say_naturally',
        text: buildNaturalizedDutchSuggestion(ctx.composerDraft, ctx.keyPhrases),
      }
    }
    case 'restart_turn': {
      const msgs = ctx.messages
      if (msgs.length < 2) return null
      const last = msgs[msgs.length - 1]!
      const prev = msgs[msgs.length - 2]!
      if (last.role !== 'assistant' || prev.role !== 'user') return null
      return { kind: 'restart_turn', nextMessages: msgs.slice(0, -2) }
    }
    case 'easier_mode': {
      const stepped = stepEasierDifficulty(ctx.difficulty)
      const nextDifficulty = stepped ?? ctx.difficulty
      return {
        kind: 'easier_mode',
        nextDifficulty,
        nextEasierModeActive: true,
        coachEn: stepped
          ? 'Easier for a bit: shorter Dutch, clearer prompts — scaffolding stays on for upcoming turns.'
          : 'You’re already on the gentlest band; we’ll keep extra short sentences and one clear question.',
      }
    }
    default:
      return null
  }
}
