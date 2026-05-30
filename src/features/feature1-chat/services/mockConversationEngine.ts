import { newFeedbackId } from '../store/conversationIds'
import type {
  ConversationStage,
  EngineTurnInput,
  EngineTurnOutput,
  FeedbackItem,
  MockIntent,
  MockIntentResult,
} from '../types'

const PLATFORM_PATTERNS =
  /\b(perron|spoor|platform|track|waar moet ik|welk perron|welk spoor|van welk)\b/i
const DELAY_PATTERNS =
  /\b(vertraging|te laat|late|uitval|gecanceld|gaat niet|rijdt niet|cancel|delayed)\b/i
const ONTIME_PATTERNS = /\b(op tijd|stipt|punctual|on time|precies op tijd)\b/i
const TRANSFER_PATTERNS = /\b(overstap|overstappen|change|transfer|moet ik overstappen|een andere trein)\b/i
const DEST_PATTERNS =
  /\b(naar |bestemming|gaat (deze|de) trein|is dit de|rit naar|verbinding|utrecht|amsterdam|rotterdam|eindhoven|schiphol)\b/i
const CLOSE_PATTERNS =
  /\b(dank|bedankt|thanks|thank you|tot ziens|fijne dag|doei|dag hoor|prima zo|oké bedankt)\b/i

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function classifyIntent(raw: string): MockIntentResult {
  const t = normalize(raw)
  if (!t) return { intent: 'unclear', confidence: 0 }

  let best: MockIntent = 'unclear'
  let score = 0

  const bump = (intent: MockIntent, s: number) => {
    if (s > score) {
      score = s
      best = intent
    }
  }

  if (CLOSE_PATTERNS.test(t)) bump('thank_close', 0.95)
  if (PLATFORM_PATTERNS.test(t)) bump('ask_platform', 0.9)
  if (DELAY_PATTERNS.test(t)) bump('ask_delay', 0.88)
  if (ONTIME_PATTERNS.test(t)) bump('ask_on_time', 0.85)
  if (TRANSFER_PATTERNS.test(t)) bump('ask_transfer', 0.87)
  if (DEST_PATTERNS.test(t)) bump('confirm_destination', 0.82)

  if (best === 'unclear' && t.length >= 12) {
    if (/\b(trein|train|ns|station)\b/.test(t)) bump('unclear', 0.35)
  }

  return { intent: best, confidence: score }
}

function nextStageAfterIntent(stage: ConversationStage, intent: MockIntent): ConversationStage {
  if (intent === 'thank_close') return stage === 'ended' ? 'ended' : 'closing'
  switch (intent) {
    case 'ask_platform':
      return 'platform_ok'
    case 'ask_delay':
    case 'ask_on_time':
      return 'timing_ok'
    case 'ask_transfer':
    case 'confirm_destination':
      return 'route_ok'
    default:
      return stage
  }
}

function personaReply(input: EngineTurnInput, intent: MockIntent): { nl: string; hint?: string } {
  const { thread, scenario, userText } = input
  const t = normalize(userText)

  const prefix = ''

  const base: Record<MockIntent, { nl: string; hint?: string }> = {
    ask_platform: {
      nl: `${prefix}Uw trein naar Utrecht Centraal vertrekt van spoor 4a. Controleer het scherm naast het perron — bij een wijziging staat het daar het eerst.`,
      hint: 'Platform 4a to Utrecht Centraal — check the platform display.',
    },
    ask_delay: {
      nl: 'Er is ongeveer vijf minuten vertraging. Het actuele vertrek is nu rond 14:37. Excuses voor het ongemak.',
      hint: '~5 min delay; updated departure ~14:37.',
    },
    ask_on_time: {
      nl: 'Volgens de actuele dienstregeling rijdt deze verbinding op tijd, mits er geen melding op het bord staat.',
      hint: 'On time per current schedule unless the board says otherwise.',
    },
    ask_transfer: {
      nl: 'Voor Utrecht Centraal hoeft u op deze verbinding niet over te stappen. U stapt één keer uit op uw bestemming.',
      hint: 'No transfer needed on this service to Utrecht Centraal.',
    },
    confirm_destination: {
      nl: 'Deze intercity heeft als bestemming Utrecht Centraal. Klopt dat met uw ticket?',
      hint: 'This IC is bound for Utrecht Centraal.',
    },
    thank_close: {
      nl: 'Graag gedaan. Prettige reis — als u nog iets nodig heeft, ik ben hier.',
      hint: 'Polite closing from the assistant.',
    },
    unclear: {
      nl: t.length < 4
        ? 'Kunt u dat in een volledige zin zeggen? Bijvoorbeeld: “Van welk perron vertrekt mijn trein naar Utrecht?”'
        : 'Ik kan u helpen met het perron, vertrek, vertraging of overstappen. Wat wilt u precies weten over uw trein?',
      hint: 'Ask for platform, time/delay, or transfers — full sentence helps.',
    },
  }

  /* Light variation if user already covered topic (stage) */
  if (intent === 'ask_platform' && thread.currentStage === 'platform_ok') {
    return {
      nl: 'Zoals gezegd: spoor 4a. Als het druk is, loop iets eerder door naar het perron.',
      hint: 'Still platform 4a — head over a bit early if busy.',
    }
  }
  if ((intent === 'ask_delay' || intent === 'ask_on_time') && thread.currentStage === 'timing_ok') {
    return {
      nl: 'De tijden zijn nog steeds zoals gemeld — houd het informatiebord in de gaten voor de laatste seconde.',
      hint: 'Times unchanged; watch the board for last-second updates.',
    }
  }

  void scenario.title

  return base[intent]
}

function buildFeedback(
  input: EngineTurnInput,
  intent: MockIntent,
  userMsgId: string
): FeedbackItem | null {
  const raw = input.userText.trim()
  if (!raw) return null

  const t = normalize(raw)
  const hasDutchShape = /\b(van|het|de|naar|is|trein|perron|spoor|dank|alstublieft)\b/i.test(raw)
  const tooEnglish = /\b(please|where|train|platform|track|delay|thanks|hello|hi)\b/i.test(raw) && !hasDutchShape

  let corrected = ''
  let explanation = ''
  let category: FeedbackItem['category'] = 'phrasing'
  const saveCandidates: string[] = []

  if (intent === 'ask_platform') {
    if (!/perron|spoor/i.test(raw) && t.length > 3) {
      corrected = 'Van welk perron vertrekt de trein naar Utrecht Centraal?'
      explanation = 'Dutch speakers usually name perron or spoor when asking at the station.'
      saveCandidates.push('perron', 'spoor')
    }
  } else if (intent === 'thank_close') {
    if (!/dank|bedankt/i.test(raw) && /thanks|thank you/i.test(raw)) {
      corrected = 'Dank u wel. Fijne dag nog.'
      explanation = 'A short Dutch close sounds natural here.'
      category = 'register'
      saveCandidates.push('Dank u wel')
    }
  } else if (intent === 'unclear' || tooEnglish) {
    corrected = 'Ik zoek het perron voor de trein naar Utrecht. Kunt u dat zien?'
    explanation = 'Good meaning — tighten the phrasing into a clear Dutch question.'
    category = 'clarity'
    saveCandidates.push('Kunt u dat zien?', 'perron')
  } else if (intent === 'ask_delay' && !/vertraging|op tijd/i.test(raw)) {
    corrected = 'Is er vertraging voor deze trein?'
    explanation = 'This is the standard, polite way to ask about delays.'
    saveCandidates.push('vertraging')
  }

  if (!corrected || normalize(corrected) === normalize(raw)) return null

  return {
    id: newFeedbackId(),
    linkedUserMessageId: userMsgId,
    original: raw,
    corrected,
    explanation,
    saveCandidates,
    category,
  }
}

export function runMockEngineTurn(input: EngineTurnInput, userMessageId: string): EngineTurnOutput {
  const { intent } = classifyIntent(input.userText)
  const { nl, hint } = personaReply(input, intent)
  const nextStage = nextStageAfterIntent(input.thread.currentStage, intent)

  const feedback =
    input.thread.feedbackMode === 'after_each'
      ? buildFeedback(input, intent, userMessageId)
      : null

  return {
    assistantMessage: nl,
    assistantTranslationHint: hint,
    nextStage,
    feedback,
    detectedIntent: intent,
  }
}

export function deferFeedbackForEnd(
  input: EngineTurnInput,
  userMessageId: string
): FeedbackItem | null {
  if (input.thread.feedbackMode !== 'at_end') return null
  return buildFeedback(input, classifyIntent(input.userText).intent, userMessageId)
}

/** Build summary sections when user ends thread */
export function buildThreadSummary(input: {
  threadId: string
  scenarioTitle: string
  stagesVisited: Set<ConversationStage>
  pendingFeedback: FeedbackItem[]
  lastAssistantSnippet?: string
}): import('../types').ConversationSummary {
  const handled: string[] = []
  if (input.stagesVisited.has('platform_ok')) handled.push('You asked about the platform clearly enough to get an answer.')
  if (input.stagesVisited.has('timing_ok')) handled.push('You checked timing or delays like a local would.')
  if (input.stagesVisited.has('route_ok')) handled.push('You confirmed route or transfers.')
  if (input.stagesVisited.has('closing')) handled.push('You closed the interaction politely.')
  if (handled.length === 0) handled.push('You stayed in the train-station scenario and kept the thread moving.')

  const improvePhrases = input.pendingFeedback.map((f) => ({
    original: f.original,
    corrected: f.corrected,
    note: f.explanation,
  }))

  const usefulPhrase =
    input.lastAssistantSnippet?.slice(0, 120) ??
    'Van welk perron vertrekt de trein naar Utrecht Centraal?'

  const allSave = input.pendingFeedback.flatMap((f) => f.saveCandidates)
  const usefulWord = allSave[0] ?? 'perron'

  return {
    threadId: input.threadId,
    handledWell: handled.slice(0, 4),
    improvePhrases: improvePhrases.slice(0, 6),
    usefulPhrase,
    usefulWord,
    nextStep: 'Tomorrow: open Talk and run the scene again, or save one phrase and practice it in Voice.',
    deferredFeedback: input.pendingFeedback.length ? [...input.pendingFeedback] : undefined,
  }
}

