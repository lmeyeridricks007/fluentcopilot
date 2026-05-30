import type { SessionLoopAdapterHints, SessionAdapterResolutionInput } from './sessionLoopAdapterTypes'
import type { TrainingLoopType } from '../trainingLoopTypes'

/** Chat sessions: text corrections → drills; include pronunciation for “say it aloud” transfer. */
const CHAT_ALLOWED = new Set<TrainingLoopType>([
  'retry_sentence',
  'structure_drill',
  'question_drill',
  'weak_words',
  'pronunciation_drill',
])

export function buildChatLoopAdapterHints(input: SessionAdapterResolutionInput): SessionLoopAdapterHints {
  const patterns = input.insights.weakPatterns
  const repeatedPattern = patterns.length >= 2 && patterns[0]?.patternId === patterns[1]?.patternId
  const grammarHeavy = patterns.some((p) => /grammar|word\s*order|verb|article|agreement/i.test(p.label))

  const transferPrompts = [
    'Pick **one** Dutch sentence you typed in this chat thread. Say it aloud twice: first slowly and clearly, then at natural conversational speed.',
    'If you corrected a line mentally, say the **corrected** version out loud—same words you would send next time.',
  ]

  const preferred: TrainingLoopType[] = ['retry_sentence', 'weak_words', 'structure_drill']
  if (grammarHeavy || repeatedPattern) preferred.unshift('structure_drill')
  preferred.push('pronunciation_drill')

  return {
    adapterId: 'chat_messaging',
    source: 'chat',
    allowedLoopTypes: CHAT_ALLOWED,
    scenarioTheme: 'general',
    miniScenarioObjectiveOverride: null,
    structurePromptTail: grammarHeavy
      ? 'Second line: keep the same meaning, but fix the recurring written pattern you kept hitting in chat.'
      : repeatedPattern
        ? 'Second line: same intent—avoid repeating the same mistake pattern from your messages.'
        : null,
    structureDrillTitleHint: grammarHeavy ? 'Chat pattern → structure rep' : null,
    questionDrillTitle: 'Chat → speaking transfer (questions)',
    questionDrillSubtitle: 'Turn a thread moment into spoken follow-ups.',
    questionDrillPrompts: [
      'From the last topic in chat, ask **two** follow-up questions in Dutch as if you were speaking face-to-face.',
      'Keep them short and natural—sound like a real conversation, not an essay prompt.',
    ],
    questionDrillExampleQuestions: ['Hoe ging dat verder?', 'Wat zou jij doen?', 'En hoe voelde dat?'],
    liveMicroReadPassage: null,
    liveMicroReadSubtitle: null,
    readAloudRetryPhrase: null,
    readAloudPacingFocusLabel: null,
    chatSpeakingTransferPrompts: transferPrompts,
    preferredLoopTypesForSession: preferred,
  }
}
