import type { SkillId } from '../../skills/skillTypes'
import type { SessionLoopAdapterHints, SessionAdapterResolutionInput } from './sessionLoopAdapterTypes'
import type { TrainingLoopType } from '../trainingLoopTypes'
import { speakLiveComprehensionWeakForListeningLoops } from '../speakLiveComprehensionSignals'
import { LISTENING_TRAINING_LOOP_TYPES } from './listeningModalityLoopAdapter'

const COACH_ALLOWED = new Set<TrainingLoopType>([
  'question_drill',
  'retry_sentence',
  'structure_drill',
  'mini_scenario',
  'pronunciation_drill',
  'weak_words',
])

function weakest(input: SessionAdapterResolutionInput): SkillId | null {
  return (input.profile.userSkillProfile?.weakestSkills?.[0] as SkillId | undefined) ?? null
}

function weakPatternLabels(insights: SessionAdapterResolutionInput['insights']): string {
  return insights.weakPatterns
    .map((p) => `${p.patternId} ${p.label}`)
    .join(' ')
    .toLowerCase()
}

export function buildLanguageCoachAdapterHints(input: SessionAdapterResolutionInput): SessionLoopAdapterHints {
  const w = weakest(input)
  const labels = weakPatternLabels(input.insights)
  const shortAnswerSignal =
    /\bshort\b|\bbrief\b|\bthin\b|\bone\s*word\b|\bexpand\b/i.test(labels) ||
    (input.insights.weakWords.length <= 1 && input.insights.strengths.length >= 2)
  const opinionSignal =
    w === 'opinions' || /opinion|omdat|want|reason|stance|because/i.test(labels) || w === 'reasoning'
  const questionSignal =
    w === 'follow_up_questions' ||
    w === 'asking_questions' ||
    /question|follow|ask back|doorvragen|vervolg/i.test(labels)

  let questionTitle = 'Follow-up question rep'
  let questionSub = 'Three stronger questions.'
  let questionPrompts = [
    'Ask three follow-up questions in Dutch about the last topic.',
    'Each question should react to what you heard, then dig one level deeper.',
  ]
  let questionExamples = ['En daarna?', 'Waarom denk je dat?', 'Hoe bedoel je precies?']

  if (questionSignal) {
    questionTitle = 'Ask-back drill'
    questionSub = 'Bounce off their last line, then ask more.'
    questionPrompts = [
      'Ask three **ask-back** questions in Dutch: one short reaction, then a follow-up that references what they said.',
      'Avoid yes/no only — aim for one “hoe / waarom / wat dan” style probe each time.',
    ]
    questionExamples = ['Ah, interessant — waarom zeg je dat?', 'En wat gebeurde er daarna?', 'Hoe voelde dat voor jou?']
  }

  let structureTail: string | null = null
  let structureTitle: string | null = null
  if (shortAnswerSignal) {
    structureTitle = 'Expand-your-answer drill'
    structureTail =
      'Second line: take one short answer you gave and stretch it to **two** Dutch sentences—add one concrete detail, time, or place.'
  } else if (opinionSignal) {
    structureTitle = 'Because-sentence drill'
    structureTail =
      'Second line: say one opinion in Dutch and add **one** reason clause (“omdat …”, “daarom …”, or “ik denk … want …”).'
  }

  const preferred: TrainingLoopType[] = ['question_drill', 'structure_drill', 'retry_sentence', 'weak_words']
  if (questionSignal) preferred.unshift('question_drill')
  if (shortAnswerSignal || opinionSignal) preferred.unshift('structure_drill')

  const earWeak = speakLiveComprehensionWeakForListeningLoops(input.speakLiveEvaluation)
  const allowed = new Set<TrainingLoopType>(COACH_ALLOWED)
  if (earWeak) {
    for (const lt of LISTENING_TRAINING_LOOP_TYPES) allowed.add(lt)
    preferred.unshift('listen_and_reply', 'listening_burst')
  }

  return {
    adapterId: 'language_coach',
    source: 'coach',
    allowedLoopTypes: allowed,
    scenarioTheme: 'general',
    miniScenarioObjectiveOverride: 'Free-talk mini-drill: replay one sticky moment with a smaller goal—same vibe, less pressure.',
    structurePromptTail: structureTail,
    structureDrillTitleHint: structureTitle,
    questionDrillTitle: questionTitle,
    questionDrillSubtitle: questionSub,
    questionDrillPrompts: questionPrompts,
    questionDrillExampleQuestions: questionExamples,
    liveMicroReadPassage: null,
    liveMicroReadSubtitle: null,
    readAloudRetryPhrase: null,
    readAloudPacingFocusLabel: null,
    chatSpeakingTransferPrompts: null,
    preferredLoopTypesForSession: preferred,
  }
}
