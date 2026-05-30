/**
 * Deterministic Speak Live session used by {@link ../speakLiveScenarioReportBenchmark.test.ts}
 * to benchmark FluentCopilot parallel scenario report generation (mocked IO in CI).
 */
import type { ConversationMessage, ScenarioConfig } from '../../../models/contracts'
import type { ScenarioDialogueStructuredOutput } from '../speakLiveScenarioDialogueStructured.schema'

export const BENCHMARK_THREAD_ID = 'benchmark-thread-fluentcopilot-1'

/** User message ids — must match structured dialogue stub rows. */
export const BENCHMARK_USER_MESSAGE_IDS = ['benchmark-ut-1', 'benchmark-ut-2', 'benchmark-ut-3'] as const

export const BENCHMARK_LEARNER_LEVEL = 'A2'

/** Tiny fake blob path so `hasLearnerAudio` is true without real storage. */
const AUDIO_META = { learnerAudioBlobPath: 'benchmark/learner-turn.webm', transcriptRaw: '' }

export function buildBenchmarkScenarioConfig(): ScenarioConfig {
  return {
    id: 'scenario-benchmark-train',
    slug: 'train_station',
    title: 'Train station',
    description: 'Ask about trains and platforms at the station.',
    userRole: 'Traveler',
    goals: ['Ask which platform the train leaves from', 'Ask if the train is on time'],
    starterSuggestions: [],
    difficultyBand: 'CEFR A2',
    tags: ['speak_live', 'benchmark'],
    allowedModes: ['guided'],
    openingMessage: 'Goedemiddag, waarmee kan ik u helpen?',
    runtimeConfig: null,
  }
}

/**
 * 6 messages: 3 assistant + 3 user (A2 Dutch), with mocked audio metadata on user turns.
 */
export function buildBenchmarkMessages(): ConversationMessage[] {
  const threadId = BENCHMARK_THREAD_ID
  const base = (m: Omit<ConversationMessage, 'threadId' | 'messageType' | 'metadata'> & {
    metadata?: ConversationMessage['metadata']
  }): ConversationMessage => ({
    threadId,
    messageType: 'text',
    metadata: null,
    ...m,
  })

  return [
    base({
      id: 'benchmark-as-1',
      sender: 'assistant',
      content: 'Goedemiddag, waarmee kan ik u helpen?',
      createdAt: '2026-05-14T10:00:00.000Z',
    }),
    base({
      id: BENCHMARK_USER_MESSAGE_IDS[0],
      sender: 'user',
      content: 'Ik wil naar Amsterdam Centraal, welk perron is mijn trein?',
      createdAt: '2026-05-14T10:00:12.000Z',
      metadata: { ...AUDIO_META, transcriptRaw: 'Ik wil naar Amsterdam Centraal, welk perron is mijn trein?' },
    }),
    base({
      id: 'benchmark-as-2',
      sender: 'assistant',
      content: 'De intercity naar Amsterdam Centraal vertrekken meestal van spoor 4 of 7. Welke trein heeft u?',
      createdAt: '2026-05-14T10:00:18.000Z',
    }),
    base({
      id: BENCHMARK_USER_MESSAGE_IDS[1],
      sender: 'user',
      content: 'De trein om tien over drie, naar Utrecht.',
      createdAt: '2026-05-14T10:00:28.000Z',
      metadata: { ...AUDIO_META, transcriptRaw: 'De trein om tien over drie, naar Utrecht.' },
    }),
    base({
      id: 'benchmark-as-3',
      sender: 'assistant',
      content: 'Die staat op spoor 7. Goede reis!',
      createdAt: '2026-05-14T10:00:35.000Z',
    }),
    base({
      id: BENCHMARK_USER_MESSAGE_IDS[2],
      sender: 'user',
      content: 'Dank u wel, fijne dag verder.',
      createdAt: '2026-05-14T10:00:42.000Z',
      metadata: { ...AUDIO_META, transcriptRaw: 'Dank u wel, fijne dag verder.' },
    }),
  ]
}

export function buildBenchmarkStructuredDialogueStub(): ScenarioDialogueStructuredOutput {
  const turnRow = (turnId: string) => ({
    turnId,
    languageScores: {
      grammar: 72,
      vocabulary: 70,
      sentenceStructure: 74,
      naturalness: 73,
      taskRelevance: 78,
    },
    mainFix: 'Keep word order natural when asking for the platform.',
    whatLanded: ['Clear question about the destination.'],
    tightenNext: ['Practice platform vocabulary aloud.'],
    correctedLine: '',
    strongerNaturalLine: '',
    weakPatterns: [],
    saveablePhrase: null,
    practiceNext: '',
  })

  return {
    overall: {
      summary: 'You handled the station dialogue clearly at A2.',
      scenarioOutcomeScore: 76,
      taskCompletionScore: 74,
      languageScore: 72,
      conversationFlowScore: 75,
      grammarScore: 72,
      vocabularyScore: 70,
      naturalnessScore: 73,
      estimatedLevel: 'A2',
      confidence: 78,
      primaryFocus: {
        title: 'Platform questions',
        why: 'You asked for the right track with understandable Dutch.',
        pattern: 'Welk perron + destination',
        example: 'Welk perron is mijn trein naar Amsterdam Centraal?',
      },
    },
    goals: [
      {
        goalId: 'platform',
        title: 'Ask which platform the train leaves from',
        weight: 0.55,
        status: 'completed' as const,
        score: 80,
        evidenceTurnIds: [BENCHMARK_USER_MESSAGE_IDS[0]],
        evidenceQuote: 'perron',
        tryNext: '',
      },
      {
        goalId: 'delay',
        title: 'Ask if the train is on time',
        weight: 0.45,
        status: 'partially_completed' as const,
        score: 62,
        evidenceTurnIds: [BENCHMARK_USER_MESSAGE_IDS[1]],
        evidenceQuote: 'trein',
        tryNext: 'Add “Is de trein op tijd?” once you know the train.',
      },
    ],
    turns: [...BENCHMARK_USER_MESSAGE_IDS].map((id) => turnRow(id)),
    recommendations: {
      nextDrillTitle: 'Platform phrases',
      nextDrillReason: 'Solidify asking for tracks under time pressure.',
      suggestedScenarioId: null,
      suggestedPracticeType: 'sentence_drill' as const,
    },
  }
}
