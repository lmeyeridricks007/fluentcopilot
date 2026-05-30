import type { SpeakLivePhase, SpeakLiveSignals } from '../../../domain/speakLive/speakLiveFsm'
import { ALL_TRAIN_STATION_GOALS, detectTrainStationSlots } from '../../../domain/speakLive/trainStationSlotState'
import type { AIResponseEnvelope, AssistantReplyEnvelope, TurnEnrichmentEnvelope } from '../../../models/contracts'

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Shared deterministic mock — used by `MockConversationAiProvider` and legacy shims. */
export function computeMockTurnEnvelope(params: {
  userText: string
  priorSummary: string | null
}): AIResponseEnvelope {
  const t = norm(params.userText)
  let assistantReply =
    'Ik kan u helpen met het perron, vertrek, vertraging of overstappen. Wat wilt u weten?'
  let stage = 'opening'
  let feedback: AIResponseEnvelope['feedback'] = null

  if (/dank|bedankt|thanks/.test(t)) {
    assistantReply = 'Graag gedaan. Prettige reis!'
    stage = 'closing'
  } else if (/\bop\s+tijd\b|\boptijd\b|\bop\s*time\b|stipt op schema|punctual/.test(t)) {
    assistantReply =
      'Ja, volgens de actuele dienstregeling rijdt deze trein op tijd. Kijk voor de zekerheid even op het perron naar het scherm.'
    stage = 'timing_ok'
  } else if (/perron|spoor|platform|waar moet|welk perron/.test(t)) {
    assistantReply =
      'Uw trein naar Utrecht Centraal vertrekt van spoor 4a. Controleer het scherm naast het perron voor de laatste wijziging.'
    stage = 'platform_ok'
  } else if (/vertraging|te laat|delay/.test(t)) {
    assistantReply =
      'Er is ongeveer vijf minuten vertraging. Het actuele vertrek is nu rond 14:37.'
    stage = 'timing_ok'
  } else if (/overstap|transfer/.test(t)) {
    assistantReply = 'Voor Utrecht Centraal hoeft u op deze verbinding niet over te stappen.'
    stage = 'route_ok'
  } else if (/where|platform|train/.test(t) && !/perron|spoor|trein/.test(t)) {
    feedback = {
      category: 'phrasing',
      originalText: params.userText,
      correctedText: 'Van welk perron vertrekt de trein naar Utrecht Centraal?',
      explanation: 'Use perron or spoor at the station.',
      severity: 'info',
    }
  }

  const summary =
    (params.priorSummary ? `${params.priorSummary} ` : '') +
    `Last user intent addressed; stage ${stage}. Key fact: platform 4a Utrecht when relevant.`

  return {
    assistantReply,
    feedback,
    saveWordCandidates: ['perron', 'vertraging'],
    scenarioProgress: { stage, notes: 'mock' },
    shouldConversationEnd: stage === 'closing',
    updatedSummary: summary.slice(0, 1200),
  }
}

export function computeMockReplyOnly(params: {
  userText: string
  priorSummary: string | null
  speakLive?: { phase: SpeakLivePhase } | null
}): AssistantReplyEnvelope {
  const full = computeMockTurnEnvelope(params)
  if (!params.speakLive) {
    return {
      assistantReply: full.assistantReply,
      scenarioProgress: full.scenarioProgress,
      shouldConversationEnd: full.shouldConversationEnd,
    }
  }

  const t = norm(params.userText)
  const ph = params.speakLive.phase
  const signals: SpeakLiveSignals = {
    rollingSummaryEnglish: full.updatedSummary.slice(0, 4000),
  }
  if (ph === 'greeting' && t.length > 0) {
    signals.nextPhase = 'intent_detection'
  }
  if (/dank|bedankt|thanks/.test(t)) {
    signals.readyForClosing = true
    signals.nextPhase = 'closing'
  } else if (ph === 'intent_detection' && t.length > 0) {
    signals.nextPhase = 'execution'
    signals.intentLabel = 'mock-intent'
  }

  const slotHits = detectTrainStationSlots(params.userText, 'mock-turn')
  const answeredGoals = slotHits.hits.map((h) => h.goalId)
  const unresolvedGoals = ALL_TRAIN_STATION_GOALS.filter((g) => !answeredGoals.includes(g))

  return {
    assistantReply: full.assistantReply,
    scenarioProgress: null,
    shouldConversationEnd: full.shouldConversationEnd,
    speakLiveSignals: signals,
    trainTurnResponse: {
      answeredGoals,
      unresolvedGoals,
      nextLikelyGoal: unresolvedGoals[0] ?? null,
      coachNotesOptional: 'mock provider: slots from rule detector only',
    },
  }
}

export function computeMockEnrichment(params: {
  userText: string
  priorSummary: string | null
  assistantReply: string
}): TurnEnrichmentEnvelope {
  void params.assistantReply
  const full = computeMockTurnEnvelope({ userText: params.userText, priorSummary: params.priorSummary })
  return {
    feedback: full.feedback,
    saveWordCandidates: full.saveWordCandidates,
    updatedSummary: full.updatedSummary,
    scenarioProgress: full.scenarioProgress,
    evaluation: null,
  }
}

export function buildMockRecapJsonString(): string {
  return JSON.stringify({
    whatWentWell: ['You asked practical station questions in Dutch.'],
    whatToImprove: ['Tighten platform questions with “perron” or “spoor”.'],
    correctedPhrases: [
      {
        original: 'Where train?',
        corrected: 'Van welk perron vertrekt de trein?',
        note: 'Name perron/spoor explicitly.',
      },
    ],
    suggestedNextAction: 'Redo the scene once tomorrow; save one phrase to your bank.',
    saveWordCandidates: ['perron', 'vertraging'],
    pronunciationHighlights: [
      { phrase: 'perron', tip: 'Stress the first syllable: PEH-ron, not peh-RON.' },
      { phrase: 'vertraging', tip: 'The “g” is a soft Dutch /ɣ/ — keep it voiced from the throat, not a hard English g.' },
    ],
  })
}
