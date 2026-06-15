import type { TurnEvaluation } from './reportTypes'

export type TeacherSummaryLocale = 'nl' | 'en'

export type SessionTeacherSummaryInput = {
  scenarioTitle: string
  wentWellBullets: string[]
  fixNextBullets: string[]
  heroLine?: string | null
  practicePhrase?: string | null
  completedCoreGoals?: number
  totalCoreGoals?: number
  turns?: TurnEvaluation[]
}

const MAX_SPEECH_CHARS = 980
/** Extra breath between major recap blocks — most TTS engines pause on an ellipsis. */
const SECTION_PAUSE = ' ... '

function cleanLine(raw: string | null | undefined): string {
  return (raw ?? '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Score lines and other UI diagnostics — not for spoken teacher feedback. */
export function isTechnicalSummaryLine(text: string | null | undefined): boolean {
  const t = cleanLine(text)
  if (!t) return true
  if (/Score\s+\d+\s*\/\s*100/i.test(t)) return true
  if (/speech\s+n\/a/i.test(t)) return true
  if (/\btask\s+\d+\b/i.test(t) && /\blanguage\s+\d+\b/i.test(t)) return true
  if (/^\d+\s*\/\s*100\b/.test(t)) return true
  if (/[·•|]/.test(t) && /\d+\s*\/\s*100/.test(t)) return true
  return false
}

function ensureSentenceEnd(text: string): string {
  const t = cleanLine(text)
  if (!t) return ''
  if (/[.!?…]$/.test(t)) return t
  return `${t}.`
}

function truncateSpeech(text: string, max = MAX_SPEECH_CHARS): string {
  const t = text.trim()
  if (t.length <= max) return t
  const slice = t.slice(0, max - 1)
  const lastStop = Math.max(
    slice.lastIndexOf('.'),
    slice.lastIndexOf('!'),
    slice.lastIndexOf('?'),
    slice.lastIndexOf('…'),
  )
  if (lastStop > max * 0.55) return `${slice.slice(0, lastStop + 1).trim()}`
  return `${slice.trimEnd()}…`
}

/** Join sentences within a section; separate sections with a TTS-friendly pause. */
function assembleSpeechScript(sections: string[][]): string {
  return sections
    .map((section) =>
      section
        .map((line) => ensureSentenceEnd(line))
        .filter(Boolean)
        .join(' '),
    )
    .filter(Boolean)
    .join(SECTION_PAUSE)
}

function dutchWordFixFromTurns(turns: TurnEvaluation[] | undefined): string | null {
  for (const turn of turns ?? []) {
    for (const ww of turn.wrongWordDetections ?? []) {
      const obs = ww.observedToken?.trim()
      const sug = ww.suggestedCorrection?.trim()
      if (!obs || !sug || obs.toLowerCase() === sug.toLowerCase()) continue
      return `Let op het woord «${sug}». Je zei «${obs}».`
    }
  }
  return null
}

function englishWordFixFromTurns(turns: TurnEvaluation[] | undefined): string | null {
  for (const turn of turns ?? []) {
    for (const ww of turn.wrongWordDetections ?? []) {
      const obs = ww.observedToken?.trim()
      const sug = ww.suggestedCorrection?.trim()
      if (!obs || !sug || obs.toLowerCase() === sug.toLowerCase()) continue
      return `Watch the word “${sug}”. You said “${obs}”.`
    }
  }
  return null
}

function pickBullets(bullets: string[], max: number): string[] {
  return bullets.map(cleanLine).filter(Boolean).slice(0, max)
}

function voiceHeroLine(raw: string | null | undefined): string | null {
  const hero = cleanLine(raw)
  if (!hero || isTechnicalSummaryLine(hero)) return null
  return hero
}

/** Warm, non-technical teacher script for post-session voice playback. */
export function buildSessionTeacherVoiceSummary(
  locale: TeacherSummaryLocale,
  input: SessionTeacherSummaryInput,
): string {
  const title = cleanLine(input.scenarioTitle) || (locale === 'nl' ? 'je spreekoefening' : 'your speaking practice')
  const hero = voiceHeroLine(input.heroLine)
  const practice = cleanLine(input.practicePhrase)
  const wordFix =
    locale === 'nl'
      ? dutchWordFixFromTurns(input.turns)
      : englishWordFixFromTurns(input.turns)

  const wellBullets = pickBullets(input.wentWellBullets, 2)
  const fixBullets = pickBullets(input.fixNextBullets, 2)

  const intro: string[] = []
  const wentWell: string[] = []
  const improve: string[] = []
  const closing: string[] = []

  if (locale === 'nl') {
    intro.push(`Hoi! Even kort terugkijken op ${title}.`)
    if (hero) {
      intro.push(hero)
    } else if (
      typeof input.completedCoreGoals === 'number' &&
      input.completedCoreGoals > 0 &&
      typeof input.totalCoreGoals === 'number' &&
      input.totalCoreGoals > 0
    ) {
      intro.push(
        `Je hebt ${input.completedCoreGoals} van de ${input.totalCoreGoals} belangrijke doelen gehaald. Dat is echt goed.`,
      )
    }

    if (wellBullets.length) {
      wentWell.push('Wat goed ging.')
      wentWell.push(...wellBullets)
    } else {
      wentWell.push('Je bleef praten en oefende door. Dat is al winst.')
    }

    if (wordFix) {
      improve.push(wordFix)
    } else if (fixBullets.length) {
      improve.push('Waar je nog aan kunt werken.')
      improve.push(...fixBullets)
    } else if (practice) {
      improve.push(`Oefen vooral deze zin: «${practice}».`)
    }

    closing.push('Blijf oefenen. Stap voor stap wordt het natuurlijker.')
  } else {
    intro.push(`Hi! Here is a quick recap of ${title}.`)
    if (hero) {
      intro.push(hero)
    } else if (
      typeof input.completedCoreGoals === 'number' &&
      input.completedCoreGoals > 0 &&
      typeof input.totalCoreGoals === 'number' &&
      input.totalCoreGoals > 0
    ) {
      intro.push(`You hit ${input.completedCoreGoals} of ${input.totalCoreGoals} key goals. Nice work.`)
    }

    if (wellBullets.length) {
      wentWell.push('What went well.')
      wentWell.push(...wellBullets)
    } else {
      wentWell.push('You kept going and finished the practice. That counts.')
    }

    if (wordFix) {
      improve.push(wordFix)
    } else if (fixBullets.length) {
      improve.push('One thing to improve next.')
      improve.push(...fixBullets)
    } else if (practice) {
      improve.push(`Try saying this line clearly: “${practice}”.`)
    }

    closing.push('Keep practicing. You are moving in the right direction.')
  }

  return truncateSpeech(assembleSpeechScript([intro, wentWell, improve, closing].filter((s) => s.length > 0)))
}

export function buildLanguageCoachTeacherVoiceSummary(
  locale: TeacherSummaryLocale,
  input: {
    focusLabel: string
    strengths: string[]
    weakPatterns: string[]
    followUp?: string | null
  },
): string {
  const focus = cleanLine(input.focusLabel)
  const strength = pickBullets(input.strengths, 1)[0]
  const weak = pickBullets(input.weakPatterns, 1)[0]
  const follow = cleanLine(input.followUp)

  const intro: string[] = []
  const body: string[] = []
  const closing: string[] = []

  if (locale === 'nl') {
    intro.push('Hoi! Even samenvatten hoe je sessie met je coach ging.')
    if (focus) body.push(`We focusten op ${focus}.`)
    if (strength) body.push(`Sterk punt: ${strength}`)
    else body.push('Je bleef in het Nederlands praten. Goed gedaan.')
    if (weak) body.push(`Let op: ${weak}`)
    else if (follow) body.push(`Volgende stap: ${follow}`)
    closing.push('Tot de volgende keer. Blijf oefenen.')
  } else {
    intro.push('Hi! Here is a quick recap of your coach session.')
    if (focus) body.push(`We focused on ${focus}.`)
    if (strength) body.push(`A strength: ${strength}`)
    else body.push('You kept speaking in Dutch. Well done.')
    if (weak) body.push(`Watch for: ${weak}`)
    else if (follow) body.push(`Next step: ${follow}`)
    closing.push('See you next time. Keep practicing.')
  }

  return truncateSpeech(assembleSpeechScript([intro, body, closing]))
}
