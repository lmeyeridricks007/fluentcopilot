/**
 * FluentCopilot Conversation Memory — user-visible copy only.
 * Tone: calm, intelligent, supportive, premium, concise.
 * Avoid internal scoring jargon; never shame the learner.
 */

// --- Cold start (hub + ribbon) ---
export const UX_COLD_BEST_NEXT_STEP =
  'A few gentle sessions help suggestions here feel more personal — no rush.'
export const UX_COLD_START_MESSAGE = UX_COLD_BEST_NEXT_STEP

export const UX_REPORT_COLD_FALLBACK_LINE =
  'Keep going — your next sessions will sharpen what appears here.'

// --- Focus chip (Fluent recommendations) ---
export const UX_FOCUS_CHIP_TITLE = 'Your focus'
export const UX_FOCUS_CHIP_REASON =
  'One clear thread so practice stays intentional without a long checklist.'

export function uxFocusChipSubtitleCold(): string {
  return 'Pick any short scene that sounds inviting'
}

export function uxFocusChipSubtitleSingle(area: string): string {
  return `Working on ${area}`
}

export function uxFocusChipSubtitleBalance(a: string, b: string): string {
  return `Working on ${a} · ${b}`
}

// --- Working-on chip fallbacks (when no focus_chip row) ---
export function uxWorkingOnChipFallbackSingle(label: string): string {
  return `Working on ${label}`
}

export function uxWorkingOnChipFallbackDual(a: string, b: string): string {
  return `Working on ${a} · ${b}`
}

// --- Report ribbon surfaces ---
export function uxRibbonSessionEcho(hints: string[]): string | null {
  if (!hints.length) return null
  const joined = hints.slice(0, 2).join(' · ')
  return `You were working through ${joined}.`.slice(0, 220)
}

export function uxRibbonRecurringPattern(label: string): string {
  return `Still refining ${label}.`.slice(0, 220)
}

export function uxRibbonImproving(labels: string[]): string | null {
  if (!labels.length) return null
  return `Improving on ${labels.slice(0, 2).join(' · ')}.`.slice(0, 220)
}

export function uxRibbonSteadyStrength(area: string): string {
  return `Especially steady lately: ${area}.`
}

export const UX_RIBBON_CONFIDENCE_EARLY =
  'Patterns become clearer after a few more sessions — we keep this light early on.'

export const UX_RIBBON_CONFIDENCE_STABLE =
  'These lines favor what looks consistent in your practice, not single slips.'

export function uxRibbonFallbackRefining(top: string): string {
  return `Across recent practice you are still refining ${top}.`
}

// --- Report “next step” block (structured recommendation) ---
export const UX_REPORT_NEXT_STEP_TITLE = 'Try next'

// --- Speak Live scenario recommendations (regex stays with patterns) ---
export type FluentScenarioUxRule = {
  re: RegExp
  slug: string
  title: string
  subtitle: string
  reason: string
  basePriority: number
}

export const FLUENT_SCENARIO_UX_RULES: FluentScenarioUxRule[] = [
  {
    re: /prep|preposit|route|richting|naar |van |uit |tegen |tussen |achter |omleiding/i,
    slug: 'directions_getting_somewhere',
    title: 'Directions',
    subtitle: 'Route questions and placement in motion',
    reason: 'Recommended because you have been building route and placement language.',
    basePriority: 72,
  },
  {
    re: /ticket|trein|spoor|station|platform|OV|metro|bus|vertraging/i,
    slug: 'train-station',
    title: 'Train & platform',
    subtitle: 'Tickets, routes, and clear travel questions',
    reason: 'Recommended because travel vocabulary has been showing up in your practice.',
    basePriority: 74,
  },
  {
    re: /pronun|klinker|tweeklank|ui|eu|ij|gch|sch|stress|medeklinker/i,
    slug: 'language_coach',
    title: 'Language Coach',
    subtitle: 'Recycle tricky sounds in relaxed conversation',
    reason: 'Recommended because sound work pairs well with short voice practice before longer reads.',
    basePriority: 68,
  },
  {
    re: /opinion|mening|standpunt|eens|oneens|discuss|argument/i,
    slug: 'opinions_discussions',
    title: 'Opinions & discussion',
    subtitle: 'Polite disagreement and clear stance sentences',
    reason: 'Recommended because opinion framing has appeared in your recent turns.',
    basePriority: 70,
  },
  {
    re: /work|colleague|kantoor|meeting|taak|project|werkplek|deadline/i,
    slug: 'work_colleague_interaction',
    title: 'Workplace Dutch',
    subtitle: 'Colleague-style requests and quick updates',
    reason: 'Recommended because workplace phrasing has been part of your mix lately.',
    basePriority: 69,
  },
  {
    re: /question|vragen|wie|wat|hoe|waarom|welk|indirecte vraag/i,
    slug: 'phone_call',
    title: 'Phone-style Dutch',
    subtitle: 'Tight question-and-answer loops',
    reason: 'Recommended because question forms are a good thread to sharpen next.',
    basePriority: 64,
  },
  {
    re: /shop|winkel|betal|kassa|boodschap/i,
    slug: 'supermarket_shop',
    title: 'At the counter',
    subtitle: 'Short, polite, clear sentences',
    reason: 'Recommended because everyday counter Dutch matches the clarity you have been polishing.',
    basePriority: 62,
  },
  {
    re: /food|eten|menu|bestel|restaurant|afspraak/i,
    slug: 'ordering_food',
    title: 'Ordering & food',
    subtitle: 'Choices, preferences, and polite requests',
    reason: 'Recommended because food contexts reinforce natural polite forms in low stakes.',
    basePriority: 61,
  },
]

export const FLUENT_WEAK_SCENARIO_TITLE = 'A scene worth revisiting'
export const FLUENT_WEAK_SCENARIO_SUBTITLE = 'Gentle reps where things still feel sticky'
export const FLUENT_WEAK_SCENARIO_REASON =
  'Recommended because this scene still asks for a little extra ease in your practice.'

export type ReadAloudUxCopy = { title: string; subtitle: string; reason: string; base: number }

export const FLUENT_READ_ALOUD_UX: Record<string, ReadAloudUxCopy> = {
  pronunciation_focus: {
    title: 'Read aloud · sound focus',
    subtitle: 'Short lines that recycle tricky Dutch sounds',
    reason: 'Recommended because your profile points to useful sound texture in short reads.',
    base: 76,
  },
  weak_sounds_focus: {
    title: 'Read aloud · tricky sounds',
    subtitle: 'Natural lines with g, ui, eu, and similar clusters',
    reason: 'Recommended because specific Dutch sounds keep earning calm repetition.',
    base: 78,
  },
  weak_vocabulary_focus: {
    title: 'Read aloud · words in context',
    subtitle: 'Built around words you have been practicing',
    reason: 'Recommended because a few words want fresh collocations, not more drilling.',
    base: 74,
  },
  grammar_focus: {
    title: 'Read aloud · sentence shapes',
    subtitle: 'Contrasting patterns in flowing prose',
    reason: 'Recommended because grammar patterns show up better in contrast than in rules.',
    base: 72,
  },
  fluency_focus: {
    title: 'Read aloud · pacing',
    subtitle: 'Breathable sentences for smoother rhythm',
    reason: 'Recommended because pacing and flow respond well to rhythmic, readable lines.',
    base: 70,
  },
  mixed_review: {
    title: 'Read aloud · mixed pass',
    subtitle: 'Light variety while reinforcing what already works',
    reason: 'Recommended because you have enough history for a balanced, unfussy review.',
    base: 66,
  },
  everyday_dutch: {
    title: 'Read aloud · everyday Dutch',
    subtitle: 'Grounded lines while your picture keeps forming',
    reason: 'Recommended because everyday passages keep momentum without over-specializing early.',
    base: 58,
  },
  scenario_linked: {
    title: 'Read aloud · linked to live practice',
    subtitle: 'Echoes themes from recent speaking sessions',
    reason: 'Recommended because your last live scenes left useful friction worth echoing in prose.',
    base: 70,
  },
  storytelling_focus: {
    title: 'Read aloud · mini-narrative',
    subtitle: 'Clear beats, time flow, and speakable story rhythm',
    reason: 'Recommended because your skill profile points to sequencing and storytelling as a growth edge.',
    base: 73,
  },
  confidence_build: {
    title: 'Read aloud · gentle wins',
    subtitle: 'Short lines, familiar words, easy success on the mic',
    reason: 'Recommended because several skills are still fragile — easy wins rebuild momentum before harder reads.',
    base: 71,
  },
}

export type FreeTalkUx = { title: string; subtitle: string; reason: string; pr: number }

export const FLUENT_FREE_TALK_UX_BY_ID: Record<string, FreeTalkUx> = {
  prepositions_in_short_replies: {
    title: 'Micro-theme · prepositions',
    subtitle: 'Tiny replies with clean placement words',
    reason: 'Recommended because prepositions want bite-sized, low-pressure reps.',
    pr: 52,
  },
  natural_question_openers: {
    title: 'Micro-theme · questions',
    subtitle: 'Natural openers without stiff textbook tone',
    reason: 'Recommended because question forms are easier when openings feel conversational.',
    pr: 50,
  },
  clear_word_shaping: {
    title: 'Micro-theme · word endings',
    subtitle: 'Clear shaping on key words',
    reason: 'Recommended because short turns help pronunciation land without performance pressure.',
    pr: 49,
  },
  appointments_and_plans: {
    title: 'Micro-theme · plans',
    subtitle: 'Light scheduling Dutch',
    reason: 'Recommended because time-and-plan language carries well from scenarios into chat.',
    pr: 47,
  },
}

/** Read Aloud authoring UI chips (learner-facing, English). */
export const UX_READ_ALOUD_UI_CHIP_SOUNDS = 'Built around tricky sounds'
export const UX_READ_ALOUD_UI_CHIP_VOCAB = 'Built around words you have been practicing'
export const UX_READ_ALOUD_UI_CHIP_GRAMMAR = 'Sentence-shape practice'
export const UX_READ_ALOUD_UI_CHIP_FLUENCY = 'Pacing-friendly lines'
export const UX_READ_ALOUD_UI_CHIP_MIXED = 'Light mixed review'
export const UX_READ_ALOUD_UI_CHIP_SCENARIO = 'Echoes recent speaking practice'
export const UX_READ_ALOUD_UI_CHIP_EVERYDAY = 'Everyday Dutch'
export const UX_READ_ALOUD_UI_CHIP_STORY = 'Story rhythm & sequencing'
export const UX_READ_ALOUD_UI_CHIP_CONFIDENCE = 'Easy wins on the mic'

export function uxReportNextStepCold(): string {
  return 'Two short sessions this week help the next suggestions here reflect your rhythm.'
}

export function uxReportNextStepWithScenario(scenarioTitle: string): string {
  const s = scenarioTitle.trim()
  return `Another short run in ${s}, then a few read-aloud lines while it is still fresh.`.slice(0, 220)
}

export function uxReportNextStepWithRead(readTitle: string): string {
  const r = readTitle.trim()
  return `Add a short ${r} pass next time — it pairs well with any scene you already like.`.slice(0, 220)
}

/** When we have session-specific coaching threads, tie the ribbon line to them (not generic modality copy). */
export function uxReportNextStepSessionAnchored(
  thread: string,
  scenarioTitle: string | null,
  readTitle: string | null,
): string {
  const raw = thread.trim().replace(/\s+/g, ' ')
  const clipped = raw.length > 96 ? `${raw.slice(0, 93)}…` : raw
  if (!clipped) {
    if (scenarioTitle?.trim()) return uxReportNextStepWithScenario(scenarioTitle)
    if (readTitle?.trim()) return uxReportNextStepWithRead(readTitle)
    return UX_REPORT_NEXT_STEP_DEFAULT
  }
  const scene = scenarioTitle?.trim() || ''
  const read = readTitle?.trim() || ''
  if (scene && read) {
    return `Build on today: ${clipped}. Try ${scene} again briefly, then ${read}.`.slice(0, 220)
  }
  if (scene) {
    return `Build on today: ${clipped}. Another short ${scene} run, then read a few lines aloud.`.slice(0, 220)
  }
  if (read) {
    return `Build on today: ${clipped}. Add a ${read} pass on your next visit.`.slice(0, 220)
  }
  return `Build on today: ${clipped}. A short Talk session soon keeps the thread warm.`.slice(0, 220)
}

export const UX_REPORT_NEXT_STEP_DEFAULT =
  'One structured scene plus a calm read-aloud in the same week — short batches stick better than one long cram.'

export const UX_REPORT_NEXT_STEP_REASON =
  'Grounded in your practice history, not generic coaching.'

export function uxBestNextScenarioTitle(scenarioTitle: string): string {
  const s = scenarioTitle.trim()
  return `A few minutes in ${s} is enough for steady reps.`.slice(0, 220)
}

export const UX_BEST_NEXT_READ_ALOUD_FALLBACK =
  'A short Read aloud pass is a calm way to reinforce recent feedback.'

// --- Adaptive scenario one-liner (Talk continue, hubs) ---
export const UX_SCENARIO_ONE_LINER_COLD =
  'This scene will adjust subtly after a couple more sessions.'

/** One line for Talk continue / hubs from live scenario stance + optional reinforcement label. */
export function uxScenarioAdaptiveUserLine(
  stance: 'reinforce' | 'stretch' | 'balanced',
  reinforcementTarget: string | null,
): string {
  const tail = reinforcementTarget?.trim() ? ` Working on ${reinforcementTarget.trim()}.` : ''
  if (stance === 'reinforce') {
    return `We will keep this scene supportive and a bit simpler.${tail}`.slice(0, 220)
  }
  if (stance === 'stretch') {
    return `You are ready for a touch more realism in this scene.${tail}`.slice(0, 220)
  }
  return `Balanced pacing for this scene.${tail}`.slice(0, 220)
}
