import { num } from './evaluationUtils'

export type ScoreBand = 'exceptional' | 'strong' | 'solid' | 'developing' | 'foundational'

export function bandForScore(n: number): ScoreBand {
  const v = Math.round(Math.max(0, Math.min(100, n)))
  if (v >= 88) return 'exceptional'
  if (v >= 74) return 'strong'
  if (v >= 60) return 'solid'
  if (v >= 45) return 'developing'
  return 'foundational'
}

const CLEAR: Record<ScoreBand, string> = {
  exceptional: 'Very clear \u2014 a Dutch listener would understand you without effort.',
  strong: 'Easy to follow, even in a noisy setting.',
  solid: 'Understandable, though a few sounds or pacing choices could be sharper.',
  developing: 'A listener would follow most of it, but some parts need clearer delivery.',
  foundational: 'Harder to catch out loud \u2014 try finishing word endings and slowing down on key words.',
}

const NATURAL: Record<ScoreBand, string> = {
  exceptional: 'Sounds close to how a Dutch speaker would naturally say this.',
  strong: 'Feels Dutch \u2014 only small word choices give away that you are still learning.',
  solid: 'The meaning is right, but the phrasing sounds a bit textbook compared to native Dutch.',
  developing: 'You got the idea across, but the word order or phrasing would sound different from a local.',
  foundational: 'The structure still feels translated \u2014 try reusing natural Dutch phrases from your feedback.',
}

const RHYTHM: Record<ScoreBand, string> = {
  exceptional: 'Your pacing feels natural \u2014 pauses and stress land where a Dutch speaker would put them.',
  strong: 'Rhythm is close to native \u2014 just a few uneven spots.',
  solid: 'A bit flatter or choppier than a Dutch speaker would sound here.',
  developing: 'Pauses and phrasing chunks still feel uneven compared with native pacing.',
  foundational: 'Rhythm is the biggest giveaway \u2014 try grouping shorter phrases and finishing endings cleanly.',
}

const PRON: Record<ScoreBand, string> = {
  exceptional: 'Consonants and vowels are crisp \u2014 easy to recognize each word.',
  strong: 'Pronunciation supports your meaning well \u2014 polish a few stressed syllables.',
  solid: 'A few words still stand out on vowel stress or endings.',
  developing: 'Several sounds need steadier placement so a Dutch listener can relax.',
  foundational: 'Pronunciation draws the most attention \u2014 try isolating and repeating the hardest words.',
}

const SCENE: Record<ScoreBand, string> = {
  exceptional: 'Fits the moment like a local would say it in this situation.',
  strong: 'Good fit for the scene \u2014 small tweaks would make it feel even more native.',
  solid: 'You stayed in the scene, but phrasing could match the setting more closely.',
  developing: 'The meaning works, but the tone or word choice drifts a bit from what the moment needs.',
  foundational: 'This felt less connected to what you were trying to do \u2014 practise the specific goal of this sentence.',
}

export type LearnerFacingMetric = {
  id: string
  title: string
  score: number
  band: ScoreBand
  body: string
}

export function buildLearnerFacingTurnMetrics(input: {
  clarity: number
  dutchLikeness: number
  rhythm: number
  pronunciation: number
  scenarioFit: number | null
  /** When false, omit rhythm and pronunciation tiles (no Azure audio on this turn / session). */
  audioMetricsAvailable?: boolean
}): LearnerFacingMetric[] {
  const c = num(input.clarity)
  const d = num(input.dutchLikeness)
  const r = num(input.rhythm)
  const p = num(input.pronunciation)
  const s = input.scenarioFit != null ? num(input.scenarioFit) : null
  const audioOk = input.audioMetricsAvailable !== false

  const CLEAR_TEXT: Record<ScoreBand, string> = {
    exceptional: 'Well-structured sentence \u2014 easy to understand at a glance.',
    strong: 'Easy to follow \u2014 the meaning comes through quickly.',
    solid: 'Understandable, though some phrasing feels slightly off.',
    developing: 'Mostly clear \u2014 occasional word order or phrasing slows the reader down.',
    foundational: 'Harder to follow \u2014 try simpler sentence shapes and standard word order.',
  }

  const NATURAL_TEXT: Record<ScoreBand, string> = {
    exceptional: 'Reads like something a Dutch speaker would actually write.',
    strong: 'Feels Dutch \u2014 only small wording choices mark it as learner text.',
    solid: 'Understandable, but still a bit textbook compared to native phrasing.',
    developing: 'You got the idea across, but word choice or word order still reads as learner Dutch.',
    foundational: 'The structure still feels translated \u2014 try reusing natural Dutch phrases from your feedback.',
  }

  const out: LearnerFacingMetric[] = [
    {
      id: 'clear',
      title: audioOk ? 'Were you understood?' : 'Was the meaning clear?',
      score: c,
      band: bandForScore(c),
      body: audioOk ? CLEAR[bandForScore(c)] : CLEAR_TEXT[bandForScore(c)],
    },
    {
      id: 'natural',
      title: audioOk ? 'Did it sound Dutch?' : 'Did it read as Dutch?',
      score: d,
      band: bandForScore(d),
      body: audioOk ? NATURAL[bandForScore(d)] : NATURAL_TEXT[bandForScore(d)],
    },
  ]
  if (audioOk) {
    out.push(
      {
        id: 'rhythm',
        title: 'Rhythm and pacing',
        score: r,
        band: bandForScore(r),
        body: RHYTHM[bandForScore(r)],
      },
      {
        id: 'pron',
        title: 'Pronunciation',
        score: p,
        band: bandForScore(p),
        body: PRON[bandForScore(p)],
      }
    )
  }
  if (s != null) {
    out.push({
      id: 'scene',
      title: 'Did it fit the situation?',
      score: s,
      band: bandForScore(s),
      body: SCENE[bandForScore(s)],
    })
  }
  return out
}

/** Fallback coaching line when the API does not return a narrative. */
export function buildFallbackDutchLikenessNarrative(input: {
  clarity: number
  dutchLikeness: number
  rhythm: number
  naturalness: number
  scenarioFit: number | null
  hasLearnerAudio: boolean
}): string {
  const dBand = bandForScore(input.dutchLikeness)
  const rBand = bandForScore(input.rhythm)
  const nBand = bandForScore(input.naturalness)

  if (!input.hasLearnerAudio) {
    return 'No recording was stored for this turn, so the feedback below is based on your text, not how you sounded.'
  }

  if (dBand === 'exceptional' || dBand === 'strong') {
    if (rBand === 'developing' || rBand === 'foundational') {
      return 'Good clarity and phrasing for your level, but your rhythm was flatter than a native speaker \u2014 let pauses and stress do more of the work.'
    }
    if (nBand === 'solid' || nBand === 'developing') {
      return 'Clear and understandable, but phrasing still sounds a bit textbook compared to how a local would say the same thing.'
    }
    return 'Strong for your level \u2014 pronunciation was clear and the sentence fit the scene well. Keep it up.'
  }

  if (dBand === 'solid' || dBand === 'developing') {
    return 'A Dutch listener would follow you, but the phrasing still sounds like learner Dutch. Try the more natural version below and listen to the native audio.'
  }

  return 'This is a good start. Focus on one short phrase, slow down the endings, and listen to the native version so your next try sounds closer to local Dutch.'
}

export function buildSessionDutchSoundSummary(input: {
  overallVoice: number
  naturalness: number
  rhythm: number
  pronunciation: number
  scenarioFit: number
  level: string
  /** When false, avoid claims about voice delivery (no session-wide audio metrics). */
  sessionAudioMetricsAvailable?: boolean
}): string {
  const level = input.level.trim() || 'your level'
  if (input.sessionAudioMetricsAvailable === false) {
    return `This feedback is based on your text and how well you completed the task at ${level}. Next time, speak into the mic to also get pronunciation and rhythm feedback.`
  }
  const v = bandForScore(input.overallVoice)
  if (v === 'exceptional' || v === 'strong') {
    return `Across the session you sounded close to natural Dutch for ${level} \u2014 especially on clarity and how you stayed in the scene.`
  }
  if (v === 'solid') {
    return `Overall you were understandable and progressing well for ${level}. Rhythm and small phrasing choices are where a Dutch ear still notices you are learning.`
  }
  return `You are practising Dutch in real situations, which is the hardest part. Next focus: steadier rhythm and cleaner word endings to sound more local.`
}
