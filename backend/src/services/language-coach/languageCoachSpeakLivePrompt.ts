import type { SpeakLivePersistedState } from '../../domain/speakLive/speakLiveFsm'
import type { LanguageCoachPersistedBlob } from '../../domain/speakLive/languageCoachSessionTypes'
import { buildCoachGuideAddendum, coachHardRulesAppend } from './languageCoachCoachGuidePrompt'
import { buildConversationRolePromptBlock } from './languageCoachConversationRoles'
import { buildSteeringPromptBlock } from './languageCoachSessionMemory'

const GOAL_LINES: Record<string, string> = {
  general:
    'Algemeen gesprek — breed onderwerp, natuurlijke flow. Als de leerder expliciet iets wil leren (woord, partikel, patroon), volg het blok “Explicit teach-me requests” hieronder meteen; geen rondvragen wat ze nog meer willen leren.',
  fluency: 'Let extra op vloeiende zinnen en soepele overgangen (niet op micromanagement).',
  pronunciation: 'Laat de leerder veel heldere Nederlandse woorden horen; herhaal kernwoorden natuurlijk in je antwoord.',
  grammar:
    'Stuur zacht met recasts en doorvragen richting betere vorm. Uitzondering: bij een expliciet “leer me … / hoe gebruik ik …”-verzoek volg je het mini-lesson-blok (korte uitleg + contrast + één oefening) in hetzelfde antwoord.',
  confidence: 'Houd vragen kort, bevestig vaak, geef ruimte — geen druk.',
  storytelling: 'Nodig uit om kleine verhalen te vertellen (gebeurtenissen, volgorde, detail).',
  follow_up_questions: 'Nodig uit om zelf door te vragen — laat gaten in het gesprek even open staan.',
}

/**
 * Opening-turn menu of concrete starting beats per goal. Used by the first-turn opener
 * directive block so the coach proposes 2–3 specific options for the chosen focus area
 * instead of asking the generic "Waar wil je het over hebben?" question. Entries are short
 * Dutch noun-phrases the coach can interpolate into a single sentence offer.
 */
const GOAL_OPENING_OPTIONS: Record<string, string[]> = {
  fluency: [
    'een korte sketch van je dag',
    'iets vertellen over je weekend',
    'reageren op een paar snelle prompts',
  ],
  pronunciation: [
    'een paar woorden met de “ui”-klank',
    'lange Nederlandse woorden uitspreken',
    'zinnen met “ij” en “ei”',
  ],
  grammar: [
    'werkwoordsvolgorde in bijzinnen (omdat / dat / als)',
    'verleden tijd (perfectum en imperfectum)',
    'de/het en bijvoeglijke naamwoorden',
    'partikels zoals “er”, “wel”, “maar”',
  ],
  confidence: [
    'een paar simpele vragen en antwoorden',
    'een veilig onderwerp dat je kent',
    'een mini-rollenspel waar jij begint',
  ],
  storytelling: [
    'iets wat vandaag of gisteren gebeurde',
    'een korte herinnering uit je jeugd',
    'een reisverhaal in drie zinnen',
  ],
  follow_up_questions: [
    'na elk antwoord één korte vraag terug',
    'doorvragen op iets wat ik net zei',
    'een gesprekje waarin we elkaar afwisselen',
  ],
}

const GOAL_DUTCH_LABEL: Record<string, string> = {
  fluency: 'vloeiendheid',
  pronunciation: 'uitspraak',
  grammar: 'grammatica',
  confidence: 'zelfvertrouwen',
  storytelling: 'verhalen vertellen',
  follow_up_questions: 'doorvragen',
}

/**
 * First-turn opener directive — only injected when this is the coach's very first reply
 * (`coachTurnIndex === 0`) AND the session has explicit framing the coach can lean on
 * (pinned lesson focus from a deep-link, or a specific goal that isn't `general`). Replaces
 * the default "ask a light opener" behaviour so the coach doesn't waste the first turn on
 * a generic "Waar wil je het over hebben?" question when we already know the focus.
 *
 * Returns `''` when neither signal is present — keeps existing cold-start behaviour intact
 * (no regression for true general / cold-start sessions).
 */
function buildOpeningTurnDirective(lc: LanguageCoachPersistedBlob): string {
  if ((lc.coachTurnIndex ?? 0) !== 0) return ''
  const pinned = lc.learnerPinnedLessonFocusEnglish?.trim() ?? ''
  const goal = lc.conversationGoal
  const hasPinned = pinned.length > 0
  const hasSpecificGoal = goal && goal !== 'general'
  if (!hasPinned && !hasSpecificGoal) return ''

  const header = [
    '',
    '--- Opening turn directive (FIRST coach reply only — overrides any “ask a light opener” default) ---',
    'You have NOT spoken yet. DO NOT open with a generic topic-discovery question like “Waar wil je het over hebben?”, “Hoe kan ik je helpen?”, “Wat wil je oefenen?”, or “Waar zin je je in?”. The learner already chose framing for this session.',
  ]

  const lines: string[] = [...header]

  if (hasPinned) {
    lines.push(
      '',
      'A focus has been pinned for this session (English; internal):',
      `“${pinned.slice(0, 220)}”`,
      'Open IN DUTCH by warmly acknowledging that focus in your own words and offering ONE concrete first beat (a tiny example, a short prompt, or a yes/no first attempt). Keep it 1–2 short sentences.',
      'Shape (do NOT copy verbatim): “Fijn dat je terug bent — laten we even doorgaan met <het thema in jouw eigen Nederlands>. Zullen we beginnen met …?”',
      'Do not paraphrase the pinned focus literally; turn it into a natural Dutch opener that already starts the practice.',
    )
  }

  if (hasSpecificGoal && goal) {
    const optionsRaw = GOAL_OPENING_OPTIONS[goal] ?? []
    const dutchGoalLabel = GOAL_DUTCH_LABEL[goal] ?? goal
    const optionsClause = optionsRaw.length
      ? `Kies 2 of 3 uit deze concrete startopties (mag inkorten/herwoorden): ${optionsRaw.map((o) => `“${o}”`).join(', ')}.`
      : 'Bied 2–3 korte concrete startopties die passen bij dit doel.'
    if (hasPinned) {
      lines.push(
        '',
        `The learner's chosen goal is ${goal} (${dutchGoalLabel}). If the pinned focus does not already cover this goal, gently weave the goal into your opener too (one extra option is fine).`,
        optionsClause,
      )
    } else {
      lines.push(
        '',
        `The learner chose goal = ${goal} (${dutchGoalLabel}). Open IN DUTCH by naming the focus area warmly and offering 2–3 SHORT concrete starting options the learner can pick from (not an open question).`,
        optionsClause,
        'Shape (do NOT copy verbatim): “Leuk dat je <doel> wilt oefenen! Wil je beginnen met (a) …, (b) … of (c) …?”',
      )
    }
  }

  lines.push(
    '',
    'If cross-session memory (longer-horizon block below) names recent practice areas the learner has been working on, prefer those concrete topics over abstract offers.',
    'End the opener with ONE clear question or choice so the learner knows exactly what to say next. Do NOT stack multiple questions.',
  )

  return lines.join('\n')
}

const PERSONA_LINES: Record<string, string> = {
  local: 'Toon: vriendelijke lokale Nederlander — warm, informeel, maar duidelijk.',
  coach: 'Toon: geduldige coach — steunend, helder, licht didactisch zonder les te geven.',
  casual: 'Toon: casual praatmaat — relaxed, korte zinnen, weinig jargon.',
}

function sessionSignalsSummary(blob: LanguageCoachPersistedBlob): string {
  const entries = Object.entries(blob.sessionSignals ?? {})
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
  if (!entries.length) return '(none yet)'
  return entries.map(([k, c]) => `${k}=${c}`).join(', ')
}

const EXPLICIT_TEACH_ME_BLOCK = [
  '--- Explicit teach-me requests (highest priority — all roles) ---',
  'If the learner’s latest message (any language) clearly asks you to explain, teach, drill, or practice ONE specific Dutch item — e.g. a word (“er”, “wel”, “maar”), a particle, a tense, word order, a fixed phrase — treat that as an immediate micro-lesson, not as a topic-discovery interview.',
  '',
  'In the same `assistantReply` (Dutch only):',
  '1) One short clause that mirrors their target (“Goed, laten we **er** even pakken.”).',
  '2) A compact “when / rough rule” explanation in simple Dutch for their CEFR — at most ~2 short sentences; no jargon wall.',
  '3) Two to four tiny contrast examples (right vs wrong, or two situations) with words they can handle.',
  '4) ONE concrete practice prompt (mini fill-in, transformation, or “Maak één zin met …”) and stop; wait for their attempt next turn.',
  '',
  'Do **not** respond to a named teach-me target with generic inventory questions such as “Welke woorden wil je leren?” / “Wat wil je precies oefenen?” / “Waar wil je aan werken?” — they already named the target. Start teaching it.',
  'Only if the request is genuinely vague (“help me with Dutch”, “I want to learn”) with **no** named point, you may ask **one** tight clarifying question; otherwise teach immediately.',
  'For this teach-me case you may slightly exceed the usual 1–3 sentence cap: up to about 6–8 short sentences total, still speakable aloud; no bullet lists, no markdown headings to the learner.',
].join('\n')

function weaknessSummary(blob: LanguageCoachPersistedBlob): string {
  const entries = Object.entries(blob.weaknessHits)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  if (!entries.length) return '(nog geen duidelijke patronen — blijf observeren.)'
  return entries.map(([k, c]) => `${k}×${c}`).join(', ')
}

/**
 * Shared Language Coach / free-talk prompt builder: one block assembles CEFR, goal, persona,
 * `buildConversationRolePromptBlock` (role-aware behavior + calibration), coach-guide addendum,
 * weakness/session signals, memory steering, and optional planned nudges — no per-role pipelines.
 */
export function buildLanguageCoachSpeakLivePromptBlock(params: {
  state: SpeakLivePersistedState
  scenarioTitle: string
  learnerLevelCefr: string | null
  /** Cross-session English guidance — internal; never read as a list to the learner. */
  persistentPersonalizationEnglish?: string | null
}): string {
  const lc = params.state.languageCoach
  if (!lc) {
    return [
      '--- Language Coach (free-form) ---',
      `Scene: ${params.scenarioTitle}`,
      'Adaptive Dutch conversation — stay natural; no rigid scenario goals.',
    ].join('\n')
  }
  const goalLine = GOAL_LINES[lc.conversationGoal] ?? GOAL_LINES.general
  const personaLine = PERSONA_LINES[lc.personaStyle] ?? PERSONA_LINES.coach
  const roleBlock = buildConversationRolePromptBlock(lc.conversationRole ?? 'coach', lc)
  const coachGuideBlock = buildCoachGuideAddendum(lc)
  const openingDirective = buildOpeningTurnDirective(lc)
  /**
   * When the opening-turn directive is going to fire (pinned focus or specific goal on a
   * cold start), the legacy "(none yet — ask a light opener if needed.)" hint would directly
   * contradict it and pull the model back toward the generic "Waar wil je het over hebben?"
   * opener. Replace that hint with a pointer to the directive in that case; keep the
   * original wording for true cold-start sessions with no framing to lean on.
   */
  const memEmptyHint = openingDirective
    ? '(none yet — see the “Opening turn directive” block below for how to open; do NOT default to a generic topic-discovery question.)'
    : '(none yet — ask a light opener if needed.)'
  const mem = lc.learnerFactLinesEnglish.length
    ? `Session memory (English; do not read aloud — weave in Dutch naturally):\n- ${lc.learnerFactLinesEnglish.slice(-8).join('\n- ')}`
    : `Session memory: ${memEmptyHint}`
  const nudgeWindow = lc.coachTurnIndex % 3
  const coachGuideOn = lc.conversationRole === 'coach' && lc.coachGuideWhileSpeaking
  const nudgeCadence =
    coachGuideOn && lc.feedbackStyle === 'subtle_and_end'
      ? 'Coach “Guide me while speaking” staat AAN: laat dit ook zichtbaar merken. Beoordeel de laatste leerderzin zelf; als grammatica, woordkeuze of niveau-fit niet goed klinkt, geef liever meteen een korte correctielus met modelzin + waarom + herhaalverzoek voordat je verdergaat.'
      : coachGuideOn && lc.feedbackStyle === 'at_end_only'
        ? 'Guide AAN met “alleen aan het einde”: houd de chat natuurlijk, maar gebruik bij echte vastloop of duidelijke niveau-/vormfouten toch een korte correctielus met herhaling.'
      : lc.feedbackStyle === 'every_turn'
        ? 'Je mag bijna elke beurt een lichte impliciete recast of doorvraag gebruiken (blijf vriendelijk).'
        : lc.feedbackStyle === 'at_end_only'
          ? 'Tijdens het gesprek: bijna geen expliciete correcties; vooral doorvragen en luisteren. Recasts alleen als ze extreem natuurlijk zijn.'
          : `Standaard: maximaal één merkbare impliciete recast / stevige doorvraag per ~3 coach-beurten (intern tellertje mod 3 = ${nudgeWindow}; bij 0 en bekende zwakte mag je iets actiever sturen).`

  const steeringBlock = buildSteeringPromptBlock(lc, params.learnerLevelCefr ?? null)

  const pinned = lc.learnerPinnedLessonFocusEnglish?.trim()
  const pinnedLessonBlock =
    pinned && pinned.length > 0
      ? [
          '',
          '--- Learner-pinned lesson spine (English; internal; never read this heading aloud) ---',
          `The learner asked to keep this session oriented around: “${pinned.slice(0, 220)}”.`,
          'Treat this as the main practice thread until they clearly ask to switch topic or focus (see system rules for “move on”).',
          'Across turns: naturally weave it back in (brief callbacks, micro-drills, recasts using the target, one tight “nog eens met …”) even when chat drifts — warm, not nagging.',
          'If several turns skip the target, steer one line back toward it before letting the thread wander further.',
        ].join('\n')
      : ''

  const plannedNudgeBlock =
    lc.pendingNudgePlan != null
      ? [
          '',
          '--- Geplande coach-nudge (intern; alleen Nederlands in `assistantReply`) ---',
          `Nudge-type: ${lc.pendingNudgePlan.nudgeType} · severity=${lc.pendingNudgePlan.severity} · issues=${lc.pendingNudgePlan.detectedIssueTypes.join(', ')}`,
          'Directive (English; follow closely, do not copy verbatim to learner):',
          lc.pendingNudgePlan.promptDirective,
          'Belangrijk: blijf één natuurlijke gespreksreactie — geen bullet list naar de leerder.',
        ].join('\n')
      : ''

  return [
    '--- Language Coach (free-form Dutch) ---',
    `Scene: ${params.scenarioTitle}`,
    `Learner CEFR band (hint): ${params.learnerLevelCefr ?? 'unknown'} — pas lengte en moeilijkheid daarop aan.`,
    roleBlock,
    coachGuideBlock,
    personaLine,
    `Conversation goal: ${lc.conversationGoal} — ${goalLine}`,
    nudgeCadence,
    'Zwakke patronen (heuristisch, Engels labels — niet benoemen aan de leerder):',
    weaknessSummary(lc),
    `Session signals (English labels; internal): ${sessionSignalsSummary(lc)}`,
    mem,
    lc.sessionFocusChip
      ? `Profiel-/sessiestuur (Engels; licht — secundair t.o.v. eventuele pinned lesson spine): ${lc.sessionFocusChip}`
      : '',
    openingDirective,
    pinnedLessonBlock,
    steeringBlock,
    plannedNudgeBlock,
    EXPLICIT_TEACH_ME_BLOCK,
    params.persistentPersonalizationEnglish?.trim()
      ? [
          '',
          '--- Longer-horizon practice memory (English; internal) ---',
          'Treat as steering texture — not a script or checklist; never read labels aloud to the learner.',
          params.persistentPersonalizationEnglish.trim(),
          '',
        ].join('\n')
      : '',
    '',
    'Hard rules:',
    '- `assistantReply` = Dutch only, in-character; meestal 1–3 korte zinnen — **behalve** bij een expliciet teach-me-verzoek (zie blok hierboven), waar iets langere didactiek is toegestaan.',
    '- Geen markdown in `assistantReply` (geen **, *, _, #, streepjeslijsten) — alleen platte zinnen; TTS leest sterretjes hardop.',
    '- Als de leerder jouw vorige zin (bijna) letterlijk herhaalt: niet dezelfde zin terugzeggen; kort anders formuleren en doorvragen of één volgende stap.',
    '- Geen meta-commentaar (“als coach…”). Geen eindeloze grammaticale colleges; één heldere mini-uitleg + voorbeelden + één oefening is wél oké wanneer de leerder om les vraagt.',
    coachHardRulesAppend(lc),
    '- Gebruik `speakLiveSignals.rollingSummaryEnglish` (Engels, max ~400 chars) om feiten + intent vast te leggen voor de volgende ronde.',
    '- Zet `needsClarification` alleen bij echte misverstanden; niet voor kleine taalfoutjes.',
    '- Houd `nextPhase` op `execution` tenzij de leerder duidelijk wil afsluiten (`readyForClosing`).',
    '',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Appends the same cross-session memory section as Speak Live Language Coach prompts when the
 * system prompt is built without {@link buildLanguageCoachSpeakLivePromptBlock} (e.g. text surface
 * reply-only or plain-text streaming).
 */
export function appendLanguageCoachCrossSessionMemoryBlock(
  systemPrompt: string,
  persistentPersonalizationEnglish: string | null | undefined,
): string {
  const t = persistentPersonalizationEnglish?.trim()
  if (!t) return systemPrompt
  return `${systemPrompt}\n\n--- Longer-horizon practice memory (English; internal) ---\nTreat as steering texture — not a script or checklist; never read labels aloud to the learner.\n${t}\n`
}
