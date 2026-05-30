/**
 * Dedicated **live-turn only** LLM prompt — not shared with chat, recap, or enrichment.
 * Optimized for minimal tokens and low latency (small system block, tiny JSON contract).
 *
 * Hard budget: system + user prompt must stay under {@link PROMPT_HARD_BUDGET_CHARS}.
 * If exceeded the prompt is truncated and a warning is logged.
 */
import type { AiConversationTurnRequest } from '../services/ai/contracts/AiConversationTurnRequest'
import { formatTrainStationSlotBlock } from '../domain/speakLive/trainStationSlotState'
import { liveSpeechRecentMessagesMax } from '../services/speak-live/liveSpeechTurnService'
import type { ChatMessage } from './buildTurnMessages'
import { buildDirectionsSpeakLiveMicroDirective } from './partials/directionsSpeakLivePrompt'

const LIVE_RECENT_TURNS_CAP = 4
/** Short-turn scenes (booking, shop, …): keep `Now:` compact for latency. */
const MAX_UTTERANCE_CHARS = 200
/** Explaining / storytelling: learner turns are multi-sentence — do not truncate `Now:` or the model only sees the opening. */
const MAX_UTTERANCE_CHARS_LONG_MONOLOGUE = 1800
/** Enough for a Dutch booking line (day + time + party) without dropping mid-phrase. */
const MAX_RECENT_SEGMENT = 150
const MAX_SLOT_CHARS = 200
const MAX_GROUNDING_CHARS = 250
/** Thread summary merges rolling English facts — critical when booking has no slot grounding. */
const MAX_THREAD_SUMMARY_MICRO = 360

/** Absolute hard ceiling on total (system + user) prompt characters. */
export const PROMPT_HARD_BUDGET_CHARS = 4000

/**
 * Tiny JSON contract (model must follow exactly). Parsed by {@link validateAndMapLiveSpeakReplyJson}.
 */
export const LIVE_MICRO_LLM_JSON_CONTRACT = `{"assistantText":"Goedemiddag — hoe kan ik u helpen?","goalHit":[]}
Example shape only — replace assistantText with your own real Dutch (never the angle brackets, never the literal word Dutch as a placeholder).
assistantText: 1–2 short Dutch sentences, max ~12 words. No teaching. Wording must sound natural in Dutch for this scene (idiomatic), not stiff or translated.
goalHit: goal indices as strings "0","1"… or []. Keep total output minimal.`

/** Micro path: explaining + storytelling need longer listener replies and full `Now:` text — overrides sentence cap above. */
const LIVE_MICRO_LLM_JSON_CONTRACT_LONG_MONOLOGUE = `{"assistantText":"…","goalHit":[]}
Example shape only — replace assistantText with your real Dutch.
OVERRIDE (explaining_something / storytelling): assistantText may be 3–8 compact Dutch sentences.
- First: faithful recap of **every** step or time slice the learner named in Now, in order (their wording where possible).
- Then: informative Dutch feedback — one alternative phrasing **or** typical missing step(s) for the assignment (short).
- Then: at most one follow-up question (or none if feedback is enough).
- No long grammar lecture. Natural Dutch.
goalHit: optional goal indices as strings "0","1"… or [].`

function formatRecentMicro(request: AiConversationTurnRequest, max: number): string {
  const slice = request.recentMessages.slice(-Math.max(1, max))
  if (!slice.length) return '—'
  return slice
    .map((m) => {
      const role = m.sender === 'user' ? 'U' : m.sender === 'assistant' ? 'A' : '?'
      const t = (m.content ?? '').trim().replace(/\s+/g, ' ')
      return `${role}:${t.slice(0, MAX_RECENT_SEGMENT)}${t.length > MAX_RECENT_SEGMENT ? '…' : ''}`
    })
    .join(' | ')
}

export type LivePromptMetrics = {
  systemChars: number
  userChars: number
  totalChars: number
  estimatedTokens: number
  recentTurnsIncluded: number
  budgetExceeded: boolean
}

export function buildLiveSpeakMicroLlmChatMessages(request: AiConversationTurnRequest): {
  messages: ChatMessage[]
  metrics: LivePromptMetrics
} {
  const sl = request.speakLive
  if (!sl) {
    throw new Error('buildLiveSpeakMicroLlmChatMessages requires speakLive')
  }
  const recentN = Math.min(LIVE_RECENT_TURNS_CAP, liveSpeechRecentMessagesMax())
  const { scenario, persona, userText } = request

  const goalsShort = sl.goalTitles
    .map((g, i) => `${i}:${g.trim().replace(/\s+/g, ' ').slice(0, 36)}${g.length > 36 ? '…' : ''}`)
    .join('|')

  const slotLine =
    scenario.slug === 'train-station'
      ? (() => {
          const raw = formatTrainStationSlotBlock(sl.state.scenarioSessionState ?? null)
          if (!raw?.trim()) return null
          const one = raw.replace(/\s+/g, ' ').trim()
          return `Slots:${one.slice(0, MAX_SLOT_CHARS)}${one.length > MAX_SLOT_CHARS ? '…' : ''}`
        })()
      : null

  const phaseShort = `${sl.state.phase}|g${sl.state.goalIndex}|✓${sl.state.goalsCompleted.join(',') || '-'}`
  const cefr =
    sl.learnerLevelCefr?.trim() && /^(A1|A2|B1|B2)$/i.test(sl.learnerLevelCefr.trim())
      ? sl.learnerLevelCefr.trim().toUpperCase()
      : ''

  const ground = sl.verifiedGroundingBlock?.trim()
    ? `Ctx:${sl.verifiedGroundingBlock.trim().replace(/\s+/g, ' ').slice(0, MAX_GROUNDING_CHARS)}`
    : ''

  const slugNorm = scenario.slug.trim().toLowerCase().replace(/-/g, '_')
  const longMonologueSlug = slugNorm === 'explaining_something' || slugNorm === 'storytelling'
  const utCap = longMonologueSlug ? MAX_UTTERANCE_CHARS_LONG_MONOLOGUE : MAX_UTTERANCE_CHARS
  const ut = userText.trim().slice(0, utCap)

  const microJsonContract = longMonologueSlug ? LIVE_MICRO_LLM_JSON_CONTRACT_LONG_MONOLOGUE : LIVE_MICRO_LLM_JSON_CONTRACT
  const sceneLabel =
    slugNorm === 'ordering_food'
      ? `Scene:Nederlandse horeca (${persona.displayName}, ${persona.role}) — alleen Nederlands.`
      : slugNorm === 'supermarket_shop'
        ? `Scene:Nederlandse winkel (${persona.displayName}, ${persona.role}) — alleen Nederlands.`
        : slugNorm === 'doctor_pharmacy'
          ? `Scene:Gezondheid taaloefening (${persona.displayName}, ${persona.role}) — alleen Nederlands; geen diagnose-engine.`
          : slugNorm === 'store_service_issue'
            ? `Scene:Winkel/servicebalie (${persona.displayName}, ${persona.role}) — alleen Nederlands.`
          : slugNorm === 'work_colleague_interaction'
            ? `Scene:Werk/collega (${persona.displayName}, ${persona.role}) — alleen Nederlands.`
          : slugNorm === 'housing_landlord'
            ? `Scene:Woning/huur (${persona.displayName}, ${persona.role}) — alleen Nederlands.`
          : slugNorm === 'phone_call'
            ? `Scene:Telefoonlijn NL (${persona.displayName}, ${persona.role}) — alleen Nederlands; geen visuele context.`
          : slugNorm === 'small_talk'
            ? `Scene:Small talk NL (${persona.displayName}, ${persona.role}) — informeel; alleen Nederlands; geen docent.`
          : slugNorm === 'meeting_new_people'
            ? `Scene:Kennismaking NL (${persona.displayName}, ${persona.role}) — eerste ontmoeting; alleen Nederlands; geen docent.`
          : slugNorm === 'party_social'
            ? `Scene:Feest/borrel NL (${persona.displayName}, ${persona.role}) — korte bursts; alleen Nederlands; geen docent.`
          : slugNorm === 'explaining_something'
            ? `Scene:Uitleg NL (${persona.displayName}, ${persona.role}) — luisteraar; langere oefenaar-beurten; alleen Nederlands; geen docent.`
          : slugNorm === 'storytelling'
            ? `Scene:Verhaal NL (${persona.displayName}, ${persona.role}) — luisteraar; langere vertel-beurten; verleden tijd; alleen Nederlands; geen docent.`
          : slugNorm === 'opinions_discussions'
            ? `Scene:Meningen NL (${persona.displayName}, ${persona.role}) — assistent zet standpunt; jij eens/oneens + reden; lichte discussie; alleen Nederlands; geen docent.`
          : slugNorm === 'directions_getting_somewhere'
            ? `Scene:Wegwijs in Nederland (${persona.displayName}, ${persona.role}) — alleen Nederlands.`
            : `Scene:${scenario.title}`

  const directionsMicro =
    slugNorm === 'directions_getting_somewhere' && scenario.runtimeConfig
      ? buildDirectionsSpeakLiveMicroDirective(scenario.runtimeConfig)
      : ''

  const globalLiveRepeatGuard =
    'Rule:Read Mem+Recent before asking—do not re-ask what the learner already answered; paraphrase briefly (“Dus …”) then at most ONE new detail or next step. If Now: asks you something, answer in Dutch first in-role before a new question.'

  const bookingMicroRule =
    slugNorm === 'booking_reservations'
      ? 'Rule:If day/time/persons/name already in Mem or Recent, do NOT ask again—confirm briefly or ask the next missing detail only.'
      : ''

  const orderingMicroRule =
    slugNorm === 'ordering_food'
      ? 'Rule:If order, allergy, drink/food choice, or price already in Mem or Recent, do NOT re-ask—confirm or ask only what is still missing.'
      : ''

  const supermarketMicroRule =
    slugNorm === 'supermarket_shop'
      ? 'Rule:If product, location, payment, or bag/receipt already in Mem or Recent, do NOT re-ask the same—confirm briefly or one new point only.'
      : ''

  const storeMicroRule =
    slugNorm === 'store_service_issue'
      ? 'Rule:If bon/receipt/aankoopbewijs, return reason, defect, or ruilen/terug already in Mem or Recent, do NOT ask again—confirm briefly or one new missing detail only.'
      : ''

  const workMicroRule =
    slugNorm === 'work_colleague_interaction'
      ? 'Rule:If task, deadline, document, or next step already in Mem or Recent, do NOT re-ask the same—confirm briefly or ask one new missing detail only. Register: colleague/team at work—never shop/service lines like “van dienst zijn” or “waarmee kan ik u helpen”.'
      : ''

  const housingMicroRule =
    slugNorm === 'housing_landlord'
      ? 'Rule:If problem, urgentie, huurdatum, borg, nutsvoorzieningen, of volgende stap al in Mem of Recent, vraag dat niet opnieuw—bevestig kort of één nieuw detail.'
      : ''

  const phoneMicroRule =
    slugNorm === 'phone_call'
      ? 'Rule:Telefoon — korte bundels; iets vlotter dan chat; één lichte misverstand of snelle zin is oké; accepteer repair; max één vraag per beurt.'
      : ''

  const smallTalkMicroRule =
    slugNorm === 'small_talk'
      ? 'Rule:Small talk — flow boven perfectie; stuur met korte reactie + soms een mini-vraag; geen les; max één lichte “awkward” of kort antwoord per paar beurten.'
      : ''

  const meetingNewPeopleMicroRule =
    slugNorm === 'meeting_new_people'
      ? 'Rule:Kennismaking — prioriteit: als Now een vraag aan jou bevat, antwoord eerst kort in rol (minstens één zin); niet overslaan om meteen weer te interviewen; daarna max één nieuwe vraag óf alleen reactie. Vroege beurt: jezelf met voornaam (“Hoi, ik ben …”), tenzij Mem je naam al heeft. Herkomst al gezegd: niet opnieuw “waar vandaan?”/plek-“En jij?”; kort erkennen, ander onderwerp. Max één vraag per beurt; geen monoloog; geen les.'
      : ''

  const partySocialMicroRule =
    slugNorm === 'party_social'
      ? 'Rule:Feest/borrel — bursts 2–4 beurten; na ~2–3 turns op zelfde haakje: lichte topic-shift ok. Mem+Recent: noteer laatste topic/feit; 1× kort terugverwijzen (“Dus …”) voor je doorschuift. Vraag-routine: ±elke 1–2 assistant-beurten een vraag of uitnodiging (behalve: user stelde net vraag → eerst kort antwoord). Lengte: meestal 1 zin; soms 2 korte zinnen. Max één vraag per beurt; awkwardness mag; geen les.'
      : ''

  const explainingSomethingMicroRule =
    slugNorm === 'explaining_something'
      ? 'Rule:Uitleg — LUISTERAAR. Na Latest: (1) luisterzin, (2) **trouw samenvatten** wat zij zeiden (hun woorden/volgorde; géén “verbeterde handleiding” die hun antwoord vervangt), (3) **informatief:** max 1–2 ontbrekende stappen voor de opdracht óf één korte formuleringstip, (4) max één vraag. Niets weglaten van hun stappen; niets verzinnen. ~4–5 korte zinnen ok. Geen lange grammaticales; Nederlands only.'
      : ''

  const storytellingMicroRule =
    slugNorm === 'storytelling'
      ? 'Rule:Verhalen — jij bent GEÏNTERESSEERDE LUISTERAAR: mini-reactie mag; geen monoloog. Na een verhaalblok: max. ÉÉN vervolgvraag (detail, “en toen?”, gevoel) — niet alles tegelijk. Moedig subtiel begin–midden–einde aan zonder les te geven. Mem+Recent: onthoud setting en wat al gezegd is; geen herhaling van dezelfde vraag. Geen les; Nederlands only.'
      : ''

  const opinionsDiscussionsMicroRule =
    slugNorm === 'opinions_discussions'
      ? 'Rule:Meningen — jij bent gesprekspartner: eerst eigen mening (1 zin), max. één “waarom?” of lichte tegenspraak; geen politiek/gevoelige onderwerpen; geen overweldigende argumenten; Mem+Recent: bouw voort op standpunt van de oefenaar; niet dezelfde vraag herhalen.'
      : ''

  const healthMicroRule =
    slugNorm === 'doctor_pharmacy'
      ? 'Rule:Mem+Recent—if answered, paraphrase then advance; no same question twice. Vary empathy (avoid repeating “dat is vervelend”). Often give 2 safe generic options OR 1 short next-step instead of only another question; Dutch only; safe generic advice.'
      : ''

  const memRaw = request.threadSummary?.trim()
  const memLine = memRaw
    ? `Mem:${memRaw.replace(/\s+/g, ' ').slice(0, MAX_THREAD_SUMMARY_MICRO)}${memRaw.length > MAX_THREAD_SUMMARY_MICRO ? '…' : ''}`
    : ''

  const system = [
    'Live Dutch scene — JSON only.',
    sceneLabel,
    globalLiveRepeatGuard,
    'assistantText: uitsluitend Nederlands — geen Engels, geen tweetalige zinnen, geen vertaling erna. Formuleer idiomatisch (zoals een moedertaalspreker in deze scène), geen letterlijke calques uit het Engels.',
    `Role:${persona.displayName} — ${persona.role}`,
    cefr ? `CEFR:${cefr}` : '',
    `State:${phaseShort}`,
    goalsShort ? `Goals:${goalsShort}` : '',
    directionsMicro,
    bookingMicroRule,
    orderingMicroRule,
    supermarketMicroRule,
    storeMicroRule,
    workMicroRule,
    housingMicroRule,
    phoneMicroRule,
    smallTalkMicroRule,
    meetingNewPeopleMicroRule,
    partySocialMicroRule,
    explainingSomethingMicroRule,
    storytellingMicroRule,
    opinionsDiscussionsMicroRule,
    healthMicroRule,
    slotLine,
    ground,
    request.learningPersonalization?.scenarioMicroHintEnglish?.trim()
      ? `Pers:${request.learningPersonalization.scenarioMicroHintEnglish.trim().replace(/\s+/g, ' ').slice(0, 200)}`
      : '',
    microJsonContract,
  ]
    .filter(Boolean)
    .join('\n')

  const user = [memLine, `Now:${ut}`, `Recent:${formatRecentMicro(request, recentN)}`].filter(Boolean).join('\n')

  const totalChars = system.length + user.length
  const budgetExceeded = totalChars > PROMPT_HARD_BUDGET_CHARS
  if (budgetExceeded && typeof console !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn(`[live-micro-prompt] BUDGET EXCEEDED: ${totalChars} chars > ${PROMPT_HARD_BUDGET_CHARS} limit`)
  }

  const metrics: LivePromptMetrics = {
    systemChars: system.length,
    userChars: user.length,
    totalChars,
    estimatedTokens: Math.max(1, Math.round(totalChars / 3.5)),
    recentTurnsIncluded: Math.min(recentN, request.recentMessages.length),
    budgetExceeded,
  }

  return {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    metrics,
  }
}
