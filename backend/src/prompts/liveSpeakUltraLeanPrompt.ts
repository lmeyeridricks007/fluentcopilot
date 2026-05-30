import type { AiConversationTurnRequest } from '../services/ai/contracts/AiConversationTurnRequest'
import { liveSpeechRecentMessagesMax } from '../services/speak-live/liveSpeechTurnService'
import { formatSpeakLiveSupportStrategyForPrompt } from '../domain/speakLive/speakLiveSupportStrategy'
import { detectTrainStationSlots } from '../domain/speakLive/trainStationSlotState'
import { normalizeTrainStationUtterance } from '../domain/speakLive/trainStationTranscriptNormalize'
import {
  accumulateAnsweredFactsFromSession,
  buildTrainStationOrchestrationInput,
  buildTrainStationTurnOrchestrationJson,
  computeRecommendedNextResponseTarget,
} from '../domain/speakLive/trainStationReplyOrchestration'
import type { ChatMessage } from './buildTurnMessages'
import { buildDirectionsSpeakLiveUltraLeanInsert } from './partials/directionsSpeakLivePrompt'

/** Hard cap 4 lines in prompt; env may request fewer via {@link liveSpeechRecentMessagesMax}. */
const LIVE_RECENT_TURNS_CAP = 4
const MAX_ORCH_JSON_CHARS = 960

/** Minimal JSON contract (Speak Live ultra-lean path only). */
export const LIVE_SPEAK_REPLY_JSON_CONTRACT = `{
  "assistantText": "string — Dutch in persona, 1–3 short sentences only",
  "answeredGoals": [0],
  "trainAnsweredGoalIds": ["ASK_PLATFORM"],
  "detectedUserIntentOptional": "short English or null",
  "pendingGoalsOptional": ["optional English hints for still-open points"]
}

Rules:
- Output this JSON object only. No markdown.
- No coaching, corrections, or score fields — in-character Dutch + compact goal markers only.
- assistantText must be **idiomatic Dutch** for the scene (natural collocations, particles, question forms a native would use at this register) — avoid English-influenced calques unless the persona would believably use them.
- answeredGoals: optional 0-based indices into the scenario goals list you satisfied this turn (max 6 entries).
- trainAnsweredGoalIds: optional; **train-station scene only** — ASK_* goal ids you satisfied (subset of scenario; omit if unsure).
- Keep detectedUserIntentOptional under 120 chars when set.
- pendingGoalsOptional: max 4 short strings; omit if nothing pending.`

function formatRecentCompact(request: AiConversationTurnRequest, max: number): string {
  const slice = request.recentMessages.slice(-Math.max(1, max))
  if (!slice.length) return '(none)'
  return slice
    .map((m) => {
      const role = m.sender === 'user' ? 'U' : m.sender === 'assistant' ? 'A' : m.sender
      const t = (m.content ?? '').trim().replace(/\s+/g, ' ')
      return `${role}: ${t.slice(0, 420)}${t.length > 420 ? '…' : ''}`
    })
    .join('\n')
}

/**
 * Legacy ultra-lean Speak Live Stage A (larger than {@link buildLiveSpeakMicroLlmChatMessages}).
 * Default live path uses the micro prompt unless `SPEAK_LIVE_LEGACY_ULTRA_LEAN_PROMPT=1`.
 * Guard: only when `request.speakLive` is set; callers should also check `useUltraLeanSpeakLivePrompt()`.
 */
export function buildSpeakLiveUltraLeanChatMessages(request: AiConversationTurnRequest): ChatMessage[] {
  const sl = request.speakLive
  if (!sl) {
    throw new Error('buildSpeakLiveUltraLeanChatMessages requires speakLive')
  }
  const recentTurnsForPrompt = Math.min(LIVE_RECENT_TURNS_CAP, liveSpeechRecentMessagesMax())
  const { scenario, persona, mode, userText } = request
  const goalsNumbered = sl.goalTitles.map((g, i) => `${i}. ${g}`).join(' | ')
  const support =
    sl.state.supportStrategy != null ? formatSpeakLiveSupportStrategyForPrompt(sl.state.supportStrategy) : null

  let trainHint = ''
  let orchSnippet = ''
  if (scenario.slug === 'train-station' && sl.userMessageId?.trim()) {
    const answered = accumulateAnsweredFactsFromSession(sl.state.scenarioSessionState)
    const orch = buildTrainStationOrchestrationInput({
      scenario,
      slotState: sl.state.scenarioSessionState,
      userText,
      userMessageId: sl.userMessageId,
      answered,
    })
    const json = buildTrainStationTurnOrchestrationJson(orch)
    orchSnippet =
      json.length > MAX_ORCH_JSON_CHARS
        ? `${json.slice(0, MAX_ORCH_JSON_CHARS)}…`
        : json
    const { hits } = detectTrainStationSlots(userText, sl.userMessageId)
    const recommended = computeRecommendedNextResponseTarget({
      userText,
      userMessageId: sl.userMessageId,
      answered,
    })
    trainHint = [
      'Train-station (compact):',
      `recommendedNextResponseTarget: ${recommended}`,
      `detectedGoalIds: ${hits.length ? hits.map((h) => h.goalId).join(', ') : '(none)'}`,
      `normalizedLatest: ${normalizeTrainStationUtterance(userText)}`,
    ].join('\n')
  }

  const levelLine =
    sl.learnerLevelCefr?.trim() && /^(A1|A2|B1|B2)$/i.test(sl.learnerLevelCefr.trim())
      ? `Learner CEFR (for register only — do not coach or score): ${sl.learnerLevelCefr.trim().toUpperCase()}.`
      : ''

  const slugNorm = scenario.slug.trim().toLowerCase().replace(/-/g, '_')
  const sceneLine =
    slugNorm === 'ordering_food'
      ? `Scene: Dutch-only café / restaurant / takeaway — ${persona.displayName} (${persona.role}). assistantText must be 100% Dutch (no English words or bilingual lines).`
      : slugNorm === 'supermarket_shop'
        ? `Scene: Dutch-only supermarket / shop — ${persona.displayName} (${persona.role}). assistantText must be 100% Dutch (no English words or bilingual lines).`
        : slugNorm === 'doctor_pharmacy'
          ? `Scene: Dutch-only doctor / pharmacy / clinic desk practice — ${persona.displayName} (${persona.role}). Language learning only; assistantText 100% Dutch; no diagnosis engine.`
          : slugNorm === 'store_service_issue'
            ? `Scene: Dutch-only store / service counter — ${persona.displayName} (${persona.role}). assistantText must be 100% Dutch (no English words or bilingual lines).`
          : slugNorm === 'work_colleague_interaction'
            ? `Scene: Dutch-only workplace colleague / team talk — ${persona.displayName} (${persona.role}). assistantText must be 100% Dutch (no English words or bilingual lines).`
          : slugNorm === 'housing_landlord'
            ? `Scene: Dutch-only housing / landlord / building manager — ${persona.displayName} (${persona.role}). assistantText must be 100% Dutch (no English words or bilingual lines).`
          : slugNorm === 'phone_call'
            ? `Scene: Dutch-only phone line — ${persona.displayName} (${persona.role}). No visual context for learner; assistantText 100% Dutch; slightly faster phone pacing than chat.`
          : slugNorm === 'small_talk'
            ? `Scene: Dutch-only small talk — ${persona.displayName} (${persona.role}). Casual social chat; assistantText 100% Dutch; not a teacher; low pressure.`
          : slugNorm === 'meeting_new_people'
            ? `Scene: Dutch-only first meeting / introductions — ${persona.displayName} (${persona.role}). Identity + light background + follow-ups; assistantText 100% Dutch; not a teacher.`
          : slugNorm === 'party_social'
            ? `Scene: Dutch-only party / social mingle — ${persona.displayName} (${persona.role}). Short dynamic bursts; topic shifts allowed; assistantText 100% Dutch; not a teacher.`
          : slugNorm === 'explaining_something'
            ? `Scene: Dutch-only explaining / listener practice — ${persona.displayName} (${persona.role}). Learner gives longer structured turns; you listen and clarify; assistantText 100% Dutch; not a teacher.`
          : slugNorm === 'storytelling'
            ? `Scene: Dutch-only storytelling / listener practice — ${persona.displayName} (${persona.role}). Learner tells past narratives; you react briefly and ask one follow-up; assistantText 100% Dutch; not a teacher.`
          : slugNorm === 'opinions_discussions'
            ? `Scene: Dutch-only opinions / light debate — ${persona.displayName} (${persona.role}). You state a clear opinion; learner agrees/disagrees and gives reasons; you challenge lightly with at most one “why?” per turn; respectful; no politics; assistantText 100% Dutch; not a teacher.`
          : slugNorm === 'directions_getting_somewhere'
            ? `Scene: Dutch-only directions / street help — ${persona.displayName} (${persona.role}). assistantText must be 100% Dutch (no English words or bilingual lines).`
            : `Scene: ${scenario.title}`

  const directionsUltra =
    slugNorm === 'directions_getting_somewhere' && scenario.runtimeConfig
      ? buildDirectionsSpeakLiveUltraLeanInsert(scenario.runtimeConfig)
      : ''

  const summaryTrimmed = request.threadSummary?.trim() ?? ''
  const memoryHint =
    slugNorm === 'doctor_pharmacy'
      ? 'Session memory (English — facts already stated; do not contradict, do not repeat the same question if already answered, vary short acknowledgements; sometimes offer two safe generic options or a brief next step instead of only another question):'
      : slugNorm === 'booking_reservations'
        ? 'Session memory (English — facts already stated; do not contradict or re-ask the same booking field):'
        : slugNorm === 'store_service_issue'
          ? 'Session memory (English — facts already stated; do not contradict or re-ask the same receipt/bon/reason/defect/solution field):'
        : slugNorm === 'work_colleague_interaction'
          ? 'Session memory (English — facts already stated; do not contradict or re-ask the same task/deadline/owner field):'
        : slugNorm === 'housing_landlord'
          ? 'Session memory (English — facts already stated; do not contradict or re-ask the same repair/rent/deposit/utilities/contract detail):'
        : slugNorm === 'phone_call'
          ? 'Session memory (English — facts already stated; do not contradict; phone line: keep replies short; if learner repaired once, do not repeat the same friction):'
        : slugNorm === 'small_talk'
          ? 'Session memory (English — what you already learned about them; do not interview—vary reactions; light topic shifts allowed):'
        : slugNorm === 'meeting_new_people'
          ? 'Session memory (English — name, place/work hints, and what they already told you; build on it; ask follow-ups without repeating the same question):'
        : slugNorm === 'party_social'
          ? 'Session memory (English — keep an explicit “last_topic” mentally (e.g. knowing people here, work, weekend); one brief callback to it before moving on; after ~2–3 turns on the same thread allow a light topic shift; vary party hooks; short bursts):'
        : slugNorm === 'explaining_something'
          ? 'Session memory (English — the assigned explanation task; which steps the learner already stated; do not ask the same clarification twice; prefer one targeted gap question):'
        : slugNorm === 'storytelling'
          ? 'Session memory (English — the story prompt; setting/time already given; which events and feelings were already told; do not ask the same follow-up twice; prefer one targeted detail or emotion question):'
        : slugNorm === 'opinions_discussions'
          ? 'Session memory (English — the topic and each side’s stated stance; reasons already given; do not repeat the same “why?” if answered; one light counter or acknowledgment per turn):'
        : slugNorm === 'ordering_food'
          ? 'Session memory (English — facts already stated; do not contradict or re-ask the same order/allergy/detail):'
          : slugNorm === 'supermarket_shop'
            ? 'Session memory (English — facts already stated; do not contradict or re-ask the same product/payment/location detail):'
            : 'Session memory (English — facts already stated; do not contradict or re-ask the same question if the learner already answered):'

  const threadBrief = summaryTrimmed
    ? `${memoryHint}\n${summaryTrimmed
        .replace(/\s+/g, ' ')
        .slice(0, 520)}${summaryTrimmed.length > 520 ? '…' : ''}`
    : ''

  const globalLeanRepeatGuard =
    'Anti-loop: read Mem + recent turns before each reply—never ask the same thing twice if the learner already answered; paraphrase once (“So you …”) then advance with at most one new question or a concrete next step. If the Latest learner utterance asks you something (Dutch question), answer it briefly in-character before you ask them something new—do not ignore their question to continue an interview.'

  const bookingLeanRule =
    slugNorm === 'booking_reservations'
      ? 'Booking: if day, clock time, party size, or name already appears above or in recent turns, acknowledge or confirm briefly—do not ask for that same detail again; only ask for what is still missing.'
      : ''

  const orderingLeanRule =
    slugNorm === 'ordering_food'
      ? 'Ordering: if dish, drink, allergy, size, or takeaway detail already appears above or in recent turns, do not re-ask—confirm or fill only what is missing.'
      : ''

  const supermarketLeanRule =
    slugNorm === 'supermarket_shop'
      ? 'Shop: if product, aisle, payment, bag, or comparison already appears above or in recent turns, do not re-ask—confirm or one new missing detail only.'
      : ''

  const storeLeanRule =
    slugNorm === 'store_service_issue'
      ? 'Store/service: if receipt/bon/aankoopbewijs, return reason, defect, or refund vs exchange already appears above or in recent turns, acknowledge briefly—do not ask for that same detail again; only what is still missing.'
      : ''

  const workLeanRule =
    slugNorm === 'work_colleague_interaction'
      ? 'Work: if the task name, deadline, owner, or next step already appears above or in recent turns, acknowledge briefly—do not ask for that same detail again; only ask for what is still missing. Tone: peer colleague / team / lead—never customer-service Dutch (“van dienst zijn”, formal counter greetings).'
      : ''

  const housingLeanRule =
    slugNorm === 'housing_landlord'
      ? 'Housing: if the problem, urgency, rent date, deposit, utilities, or next visit step already appears above or in recent turns, acknowledge briefly—do not ask for that same detail again; only ask for what is still missing.'
      : ''

  const phoneLeanRule =
    slugNorm === 'phone_call'
      ? 'Phone: if time, name, purpose, or availability already appears in Mem or recent turns, confirm briefly—do not re-ask the same field; advance the call.'
      : ''

  const smallTalkLeanRule =
    slugNorm === 'small_talk'
      ? 'Small talk: if the learner already answered, react briefly and nudge forward—do not loop the same question; keep it human and relaxed.'
      : ''

  const meetingNewPeopleLeanRule =
    slugNorm === 'meeting_new_people'
      ? 'First meeting: early assistant turns must include your first name (“Hoi, ik ben …”) before you only ask how they got somewhere or similar — model a real intro unless Mem+recent already states your name. Use Mem+recent+Latest learner utterance for learner name, origin, and work—acknowledge briefly, never re-ask the same fact (if they already said where they are from, do not echo “En jij?” / “Waar kom je vandaan?” for place). Priority: if their latest line asks you anything, answer that first in Dutch (≥1 sentence), then at most one new question—or no new question (reaction-only is natural). Otherwise: short human reaction, then at most one follow-up. Keep assistant replies short; avoid stacking questions—let the learner carry new information roughly half the time; no teaching tone.'
      : ''

  const partySocialLeanRule =
    slugNorm === 'party_social'
      ? 'Party mingle: non-linear—bursts of 2–4 turns; after ~2–3 turns on the same micro-thread, you may pivot to a new light angle (work/weekend/host/hobby). Mem+recent: remember last topic and one fact—reference it once briefly (“So you … / Dus …”) before advancing. Question cadence: aim for a question or clear invite to elaborate every 1–2 assistant turns (if the learner just asked you something, answer in one short line first, then return to a question). Length: ~two-thirds one short sentence, ~one-third two short sentences for warmth—never a monologue. Do not repeat the same party question; slightly unpredictable and light awkwardness ok; no teaching tone.'
      : ''

  const explainingSomethingLeanRule =
    slugNorm === 'explaining_something'
      ? 'Explaining practice: listener—not a lecturer. After Latest: (1) brief listen signal, (2) **faithful recap** of their steps (stay close to their wording—do not replace their answer with a polished “ideal” script), (3) **informative layer:** name 0–2 missing steps for the task and/or one short phrasing/connector tip, (4) at most one follow-up question. Do not drop their steps; do not invent steps. Up to ~4–5 short Dutch sentences; no long grammar lecture; Dutch only in assistantText.'
      : ''

  const storytellingLeanRule =
    slugNorm === 'storytelling'
      ? 'Storytelling practice: you are an interested friend/listener—not a lecturer. After the learner’s story chunk, at most ONE short move: (a) brief reaction + one follow-up (“En toen?”, “Hoe was dat?”, “Waar was je precies?”), or (b) gentle paraphrase-check—never stack multiple questions. Nudge arc subtly (beginning/middle/ending) without naming “lesson”. Encourage past tense by modeling lightly in your reactions, not by grammar lecture. Use Mem+recent to avoid repeating the same question. Dutch only in assistantText.'
      : ''

  const opinionsDiscussionsLeanRule =
    slugNorm === 'opinions_discussions'
      ? 'Opinions practice: you are a neutral Dutch conversation partner—not a debater or teacher. State one clear opinion line, then listen. After the learner responds, at most ONE light move: “Waarom vind je dat?”, a brief soft disagreement (“Ik ben het niet helemaal eens …”), or “Interessant — en …?”—never stack attacks or multiple questions. Stay on safe everyday topics; no politics or sensitive issues. Use Mem+recent so you do not repeat the same challenge. Dutch only in assistantText.'
      : ''

  const healthLeanRule =
    slugNorm === 'doctor_pharmacy'
      ? 'Health practice: use Mem+Recent—if the learner already answered, paraphrase (“So you have …?”) and move on; never ask the same clinical question twice. Do not use “dat is vervelend” every turn—rotate short natural acknowledgements. Every ~2nd turn, prefer either two brief safe options or one mini next-step (language practice only) instead of stacking another new question; stay generic and safe.'
      : ''

  const system = [
    'You are the in-scene Dutch assistant. Output a single JSON object only (no markdown).',
    sceneLine,
    globalLeanRepeatGuard,
    `Role: ${persona.displayName} — ${persona.role}. Tone: ${persona.tone}.`,
    levelLine,
    `Practice mode: ${mode}. Speak Dutch in assistantText only — no English coaching in assistantText; never prefix an English phrase before Dutch. Prefer natural spoken Dutch (idiomatic, scene-appropriate) over literal or stiff word-for-word phrasing.`,
    directionsUltra ? `Directions contract (trimmed if long):\n${directionsUltra}` : '',
    threadBrief,
    bookingLeanRule,
    orderingLeanRule,
    supermarketLeanRule,
    storeLeanRule,
    workLeanRule,
    housingLeanRule,
    phoneLeanRule,
    smallTalkLeanRule,
    meetingNewPeopleLeanRule,
    partySocialLeanRule,
    explainingSomethingLeanRule,
    storytellingLeanRule,
    opinionsDiscussionsLeanRule,
    healthLeanRule,
    `Session phase: ${sl.state.phase}. Active goal index: ${sl.state.goalIndex}. Completed goal indexes: [${sl.state.goalsCompleted.join(', ') || 'none'}].`,
    `Scenario goals: ${goalsNumbered || '(none)'}`,
    support ? `Support hint (English, meta): ${support}` : '',
    sl.verifiedGroundingBlock?.trim() ? `Grounding (obey over stale chat):\n${sl.verifiedGroundingBlock.trim().slice(0, 2000)}` : '',
    trainHint,
    orchSnippet ? `Turn orchestration JSON (trimmed):\n${orchSnippet}` : '',
    request.learningPersonalization?.scenarioMicroHintEnglish?.trim()
      ? `Adaptive hint (English, internal; weave naturally, do not quote): ${request.learningPersonalization.scenarioMicroHintEnglish.trim().replace(/\s+/g, ' ').slice(0, 220)}`
      : '',
    '',
    'Contract:',
    LIVE_SPEAK_REPLY_JSON_CONTRACT.trim(),
    slugNorm === 'explaining_something' || slugNorm === 'storytelling'
      ? '\nCONTRACT OVERRIDE (explaining_something / storytelling): Ignore the generic “1–3 short sentences only” cap for assistantText. Use 3–8 compact Dutch sentences when Latest is a multi-part learner turn: recap **every** step or event from Latest in order (faithful paraphrase), then optional better phrasing or missing-step hint in Dutch, then at most one follow-up question.'
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const user = [
    `Latest learner utterance (normalized Dutch, primary): ${userText}`,
    '',
    `Recent turns (oldest first, max ${recentTurnsForPrompt}):`,
    formatRecentCompact(request, recentTurnsForPrompt),
  ].join('\n')

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}
