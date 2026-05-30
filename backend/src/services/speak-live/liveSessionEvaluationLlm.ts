import { z } from 'zod'
import { runSpeakLiveEvalChatCompletion } from '../ai/speakLiveEvalChatCompletion'
import { runSpeakLiveStructuredTranscriptEvaluation } from './speakLiveStructuredTranscriptEvaluationService'
import type { SpeakLiveStructuredTranscriptEvalOptions } from './speakLiveStructuredTranscriptEvaluationService'
import {
  getAzureOpenAiSpeakLiveSessionEvalDeployment,
  getResolvedAiProviderId,
  getSpeakLiveEvaluationAiMaxRetries,
  getSpeakLiveEvaluationAiRequestTimeoutMs,
  getSpeakLiveSessionEvaluationModel,
  speakLiveEvalCredentialsReady,
  isSpeakLiveLegacyTranscriptEvalLlmEnabled,
  isSpeakLiveTranscriptEvalLegacyFallbackEnabled,
} from '../ai/config/aiProviderConfig'
import type { SpeakLiveCoachingFallbackCode, SpeakLiveCoachingModelMeta } from './liveVoiceEvaluationTypes'

const TurnLanguageEvaluationLlmSchema = z
  .object({
    grammarScore: z.number().min(0).max(100),
    sentenceConstructionScore: z.number().min(0).max(100),
    naturalnessScore: z.number().min(0).max(100),
    levelFitScore: z.number().min(0).max(100),
    whatWorked: z.array(z.string().max(400)).max(8),
    grammarIssues: z.array(z.string().max(400)).max(8),
    sentenceStructureIssues: z.array(z.string().max(400)).max(8),
    wordOrderNotes: z.array(z.string().max(400)).max(6).optional(),
    questionFormNotes: z.array(z.string().max(400)).max(4).optional(),
    verbTenseNotes: z.array(z.string().max(400)).max(4).optional(),
    agreementNotes: z.array(z.string().max(400)).max(4).optional(),
    improvedVersion: z.string().max(4000),
    whyItIsBetter: z.string().max(2000),
    whyThisIsMoreNatural: z.string().max(2000).optional(),
    nextPatternToPractice: z.string().max(800).optional(),
    learnerFacingGrammarLine: z.string().max(900).optional(),
    levelBasedComment: z.string().max(2000),
    nextStepBeyondLevel: z.string().max(1200).optional(),
  })

export const WrongWordDetectionLlmSchema = z
  .object({
    observedToken: z.string().max(120),
    classification: z.enum(['non_word', 'likely_misrecognition', 'wrong_word_choice', 'misspelling']),
    suggestedCorrection: z.string().max(120),
    whyItMatters: z.string().max(800),
    severity: z.enum(['high', 'medium', 'low']),
    uncertainHearing: z.boolean().optional(),
  })

const LiveEvalLlmImprovementActionSchema = z
  .object({
    type: z.enum([
      'save_phrase',
      'save_pronunciation_word',
      'save_rhythm_drill',
      'save_natural_phrasing',
      'scenario_follow_up',
      'sentence_drill',
      'review_queue',
    ]),
    title: z.string().max(240),
    detail: z.string().max(900),
    targetPhrase: z.string().max(500).optional(),
    targetWord: z.string().max(80).optional(),
  })

export const LiveEvalLlmTurnSchema = z
  .object({
    turnId: z.string().uuid(),
    referenceSentence: z.string().max(4000),
    referenceKind: z.enum(['reference_pronunciation', 'more_natural_dutch']),
    referenceSentenceReason: z.string().max(1500),
    scenarioGoalFit: z
      .object({
        summary: z.string().max(900),
        alignmentScore: z.number().min(0).max(100),
        relevantGoals: z.array(z.string().max(240)).max(8),
      }),
    languageScores: z
      .object({
        naturalness: z.number().min(0).max(100),
        contextualFit: z.number().min(0).max(100),
        registerFit: z.number().min(0).max(100),
        grammaticalStability: z.number().min(0).max(100),
      }),
    keyStrengths: z.array(z.string().max(500)).max(8),
    keyProblems: z.array(z.string().max(500)).max(10),
    chunkingRhythmSuggestion: z.string().max(1200),
    focusWords: z.array(z.string().max(80)).max(14),
    dutchLikenessNarrative: z.string().max(380),
    improvementActions: z.array(LiveEvalLlmImprovementActionSchema).max(10),
    wrongWordDetections: z.array(WrongWordDetectionLlmSchema).max(8).optional(),
    turnLanguageEvaluation: TurnLanguageEvaluationLlmSchema.optional(),
  })

export const LiveEvalLlmFollowUpSchema = z
  .object({
    type: z.enum([
      'pronunciation_drill',
      'rhythm_drill',
      'phrase_drill',
      'natural_phrasing_drill',
      'repeat_scenario',
      'library_phrase',
      'library_word',
      'sentence_drill',
      'coach_followup',
    ]),
    title: z.string().max(400),
    reason: z.string().max(1200),
    linkedScenarioIdOptional: z.string().max(200).nullable().optional(),
    linkedPhraseOptional: z.string().max(500).nullable().optional(),
    linkedWordOptional: z.string().max(120).nullable().optional(),
  })

export const LiveEvalLlmSessionSchema = z
  .object({
    overallCoachSummary: z.string().max(2000),
    grammarConstructionSessionSummary: z.string().max(2000).optional(),
    fluencyRhythmSummary: z.string().max(1200),
    pronunciationSummary: z.string().max(1200),
    whatToTryNext: z.array(z.string().max(500)).max(10),
    strongestAreas: z.array(z.string().max(200)).max(8).optional(),
    weakestAreas: z.array(z.string().max(200)).max(8).optional(),
    mostImportantNextStep: z.string().max(1200).optional(),
    savedTrainingRecommendationsSummary: z.string().max(2000).optional(),
    turns: z.array(LiveEvalLlmTurnSchema).max(40),
    recommendedFollowUps: z.array(LiveEvalLlmFollowUpSchema).max(16),
  })

export type LiveEvalLlmSession = z.infer<typeof LiveEvalLlmSessionSchema>
export type LiveEvalLlmTurn = z.infer<typeof LiveEvalLlmTurnSchema>

export type LiveEvalLlmResult = {
  source: 'llm' | 'deterministic'
  reason?: string
  /** When source is deterministic, why the live model was not used (all scenarios). */
  fallbackCode?: SpeakLiveCoachingFallbackCode
  data: LiveEvalLlmSession
}

const SPEAK_LIVE_COACHING_FALLBACK_USER_MESSAGES: Record<SpeakLiveCoachingFallbackCode, string> = {
  no_api_key:
    'The live coaching model is not configured on this server (no API key). This report uses a built-in template instead, so sentence-level suggestions may be generic for every scenario.',
  mock_provider:
    'The app is in mock AI mode, so the live coaching model did not run. This report uses a built-in template instead.',
  timeout_or_network:
    'The coaching model did not finish in time or the connection dropped. This report uses a built-in template. When your network is stable, use Regenerate report to try again.',
  parse_error:
    'The coaching model returned data this server could not read. This report uses a built-in template; try Regenerate report later.',
  validation_error:
    'The coaching model returned an incomplete structure. This report uses a built-in template; try Regenerate report later.',
}

export function buildSpeakLiveCoachingModelMeta(result: LiveEvalLlmResult): SpeakLiveCoachingModelMeta {
  if (result.source === 'llm') return { source: 'llm' }
  const code: SpeakLiveCoachingFallbackCode = result.fallbackCode ?? 'validation_error'
  return {
    source: 'deterministic',
    fallbackCode: code,
    userMessage: SPEAK_LIVE_COACHING_FALLBACK_USER_MESSAGES[code],
  }
}

const SYSTEM = `You are FluentCopilot's senior Dutch voice coach for Speak Live post-session evaluation.

Inputs per turn may include:
- learner transcript (original)
- optional Azure Speech JSON summary (pronunciation/fluency/completeness + weak words) from REAL audio
- assistant reply snippet and scenario goals

Your JSON output MUST be safe and structured.

DUTCH NATURALNESS (you are the LLM quality gate — apply on every turn):
- Every **Dutch** string you output (referenceSentence, improvedVersion, naturalRewrite fields if present, improvementActions that quote Dutch, chunkingRhythmSuggestion when it contains Dutch) must sound like **idiomatic spoken Dutch at the session CEFR**, not a word-for-word English calque or textbook-odd phrasing.
- Prefer what a native would say in this scenario (shop, phone, small talk, etc.); when unsure between two forms, pick the more common colloquial one for the level.
- improvementActions: titles/details may be English for meta clarity, but any **embedded Dutch line** must already be natural — do not ship awkward Dutch “because the learner said something similar”.

SCORING RULES for languageScores (each 0\u2013100 integers):
- Base scores ONLY on transcript + scenario + assistant context when audio summary is missing or uncertain.
- When Azure summary is present, you may let naturalness/contextual/register reflect that the learner was intelligible, but do NOT copy Azure numbers into languageScores \u2014 these dimensions are transcript/scene judgments.
- Be conservative and believable: scores of 95+ should be rare. For A2, a clean but imperfect line is usually ~72\u201386, not high 90s.
- If a key Dutch word is wrong for the meaning (even if understandable), naturalness and contextualFit must drop meaningfully.
- If grammar/word order is shaky for the level, grammaticalStability must reflect it (do not cluster everything in the high 90s).

wrongWordDetections (optional but STRONGLY encouraged when applicable):
- Emit when the learner transcript contains a wrong/non-Dutch token, a likely ASR mis-hearing, or a clear miss vs the intended station/service Dutch.
- Each item needs observedToken, classification, suggestedCorrection, whyItMatters, severity.
- **observedToken must be a substring of the learner transcript for this turn** (as its own word, or the whole phrase if multi-word): never flag a token the learner did not say; if you meant a contrast with the reference, encode that in whyItMatters / improvedVersion instead of inventing a fake observedToken.
- Use likely_misrecognition + uncertainHearing when audio evidence is weak or the mistake is plausibly recognition noise.
- **Non-words / STT hallucinations:** If a surface token is not plausible Dutch in context (gibberish, wrong-language junk, or clear mis-hearing vs the scene), set classification to **non_word** or **likely_misrecognition** and set **suggestedCorrection** to the **Dutch word or short phrase** the learner most likely meant — infer from referenceSentence, improvedVersion, assistant context, and scenario. **Never** treat nonsense tokens as vocabulary to drill; the learner needs the intended Dutch target, not rehearsal of garbage text.
- A separate verify model pass will drop bad word-level items; still avoid obvious misalignments (e.g. pairing a token from one clause with a verb from another).

Contextual intent for **wrongWordDetections** and **improvedVersion** (prefer reasoning over literal transcript matching):
- A surface token can be **valid Dutch but the wrong word for what the learner meant** in this scene (common with ASR and near-homophones). Infer probable intent using **scenario title + goals**, the **assistant’s preceding line**, and the **whole learner utterance** — not only whether the token matches referenceSentence.
- When the scene clearly implies one reading (e.g. paying at a counter, buying a ticket, asking to use card payment) but the transcript uses a **sound-alike** that would mean something else in real life, emit **wrongWordDetections** with **suggestedCorrection** set to the Dutch they most likely meant, **classification** "likely_misrecognition" (or "wrong_word_choice" if it is a learner slip), and **whyItMatters** that explains the **situational** contrast (why the transcript word does not fit this moment).
- Grammar after modals: e.g. **Mag ik / Kan ik** + **infinitive** ("betalen"), not the *jij*-form ("betaal") — flag that in wrongWordDetections and/or grammarIssues when it appears in permission questions.
- Do **not** rely on a fixed phrase list; use judgment. If intent is ambiguous, omit the word-level flag rather than guess.

Caf\u00e9 / ordering-food ASR and intent (when scenario is food, drink, or restaurant service):
- Speech-to-text often merges or mis-hears Dutch sound-alikes: e.g. \u201cgrote koffie\u201d \u2192 \u201cgruttenkoffie\u201d, \u201chavermelk\u201d \u2192 \u201charder melk\u201d / \u201charde melk\u201d, \u201cHebt u\u201d \u2192 nonsense tokens like \u201cHept\u00e9\u201d.
- Infer the learner\u2019s probable intent from the scene (ordering, milk type, size, price) even if the transcript token is not real Dutch.
- Put the best natural Dutch they meant in improvedVersion and referenceSentence; explain briefly in learnerFacingGrammarLine.
- Do NOT give generic \u201cmake a full sentence\u201d coaching when the line is already a short service request \u2014 prefer correcting likely ASR/word errors to the phrase a Dutch speaker would say.

turnLanguageEvaluation (required per turn object):
- Explicitly judge: grammar correctness, sentence completeness, word order, question structure, verb placement (where relevant), tense fit vs scene, pronoun/article/basic agreement \u2014 ALL relative to the session CEFR level.
- A1: survival lines and short chunks accepted; reward intelligibility and scene-appropriate intent.
- A2: short functional sentences; clearer question forms and basic word order when attempting statements/questions \u2014 do NOT expect B1 polish.
- B1: more natural flow, connectors, and stronger grammar when the learner produces longer utterances.
- Do NOT penalize an A2 learner for not sounding B2. levelFitScore rewards "good for this level", not "native-like".
- levelBasedComment: one short paragraph answering "Is this good enough for the learner's level?" (fair, motivating).
- learnerFacingGrammarLine: ONE sentence, warm and specific, in tones like: "Good enough for A2, but the question form was still slightly literal." / "Clear meaning, but word order sounded more English-influenced than Dutch." / "A Dutch speaker would more naturally say \u2026" (paraphrase intent, not a template copy).
- whyThisIsMoreNatural: one short paragraph \u2014 why improvedVersion sounds more natural at this level (if you only write whyItIsBetter, duplicate the same text into whyThisIsMoreNatural).
- whyItIsBetter: still required \u2014 practical contrast vs the learner line (can match whyThisIsMoreNatural).
- nextPatternToPractice: one concrete drill target whenever any grammar/structure issue exists (e.g. "Verb-second in yes/no questions" / "Past tense in short service lines"). If the line is solid for level, set a small stretch pattern (e.g. "Add one polite softener").
- grammarIssues: concrete misses (articles, wrong auxiliary, etc.) \u2014 empty if none worth mentioning.
- sentenceStructureIssues: completeness, clause order, missing subject, etc.
- wordOrderNotes, questionFormNotes, verbTenseNotes, agreementNotes: use only when relevant; keep bullets short.
- improvedVersion: natural Dutch at the learner's level (not artificially advanced).
- If keyProblems calls the line long, wordy, or “more than necessary”, you MUST set improvedVersion (and usually referenceSentence) to a **shorter** Dutch line that keeps the same customer intent — never only vague length advice. Example: “Dank je wel, ik heb een tas nodig.” → “Ik heb ook een tas nodig, dank je.” or “Mag ik een tas?” depending on tone; say briefly whether dropping the extra thanks is optional.
- **Exception (storytelling / explaining_something):** never satisfy “too long” by deleting middle or **ending** beats. For career stories, timelines, or explanations, improvedVersion must still include **every recoverable factual claim** (dates, counts, past vs present role, promotions, **current job title** such as chief architect, final outcome, comparisons). You may only tighten redundant filler words, not collapse the arc into a short summary that omits the last sentences.
- Separate audio judgments (Azure summary) from grammar: grammarIssues come from transcript analysis, not from guessing mouth position.
- Use learnerTranscript (raw) vs learnerTranscriptNormalized when they differ \u2014 note normalization fixes (e.g. homophones) briefly in grammarIssues only when relevant.

**Storytelling / explaining_something monologues** (when the session scenario slug is storytelling or explaining_something):
- If a learner turn is clearly **multi-sentence** or longer than ~120 characters, turnLanguageEvaluation.improvedVersion MUST be a **complete fluent Dutch rewrite of that entire turn** \u2014 same facts, beats, or steps in the same order, but with natural grammar, tense, articles, and connectors at the session CEFR. Do **not** return only a polished first sentence or clause.
- **Coverage check:** before you finish, mentally walk the learnerTranscript from first clause to last. improvedVersion must mention **each distinct beat** (e.g. how long ago they started, what they did first, how scope grew, **where they stand now**). If the transcript ends with a role or title (e.g. chief architect), the rewrite **must** end with that idea in natural Dutch, not stop earlier at “more responsibilities” unless the transcript truly never claimed a final role.
- **ASR noise:** when a tail clause is garbled, infer the most likely Dutch meaning from context (job titles, “nu/ben ik”, architecture/IT vocabulary) rather than dropping the ending.
- mainFixLine stays a **short** hook (one issue to watch: tense, word order, one key connector, etc.).
- referenceSentence should be a learner-role line that matches the improved meaning; for long monologues it may match improvedVersion when that is the clearest single practice target.

grammarConstructionSessionSummary (optional session key):
- 1\u20132 short paragraphs on how grammar + sentence construction went across turns for THIS level; highlight one win and one priority pattern \u2014 no harsh tone.

Session-level optional keys (include when confident):
- strongestAreas: 2\u20134 short labels (e.g. "Clear intent in scene", "Pronunciation on high-frequency words").
- weakestAreas: 2\u20134 short labels grounded in this session's turns.
- mostImportantNextStep: single highest-leverage habit for the next session.
- savedTrainingRecommendationsSummary: one paragraph on what to save / drill from improvementActions across turns.

improvementActions:
- Every title and detail must cite THIS turn (transcript words, scenario, or a specific weak word from Azure summary when given).
- No generic "practice more" without a concrete target phrase or word.
- Include 4\u20137 actions when possible; at least 3.
- When hasLearnerAudio is false: do NOT emit save_rhythm_drill or save_pronunciation_word (no audio evidence).

referenceSentence: natural Dutch at the stated CEFR level — always phrased as what the LEARNER (customer / traveler) should say next time, not what the shop assistant or waiter should answer.
- When the learner line is a customer question (for example contains “?” or starts with “Mag ik…”, “Kan ik…”, “Kunt u…”, “Waar…”, “Hoeveel…”), referenceSentence MUST stay a clearer or more polite variant of that same question. Do NOT replace it with a staff reply such as “Ja, u kunt …” — that belongs in the assistant column, not the learner coaching target.
- For customer statements (bag, receipt, payment), keep the learner’s role: requests and confirmations the shopper would say, not the cashier’s script unless the learner was role-playing staff.
- Small talk / weekend check-in: the natural Dutch for “how was your weekend?” is “Hoe was je weekend?” (hoe = how). Do not put “Wat was je weekend?” in referenceSentence or improvedVersion for that meaning — “wat” reads as “what”, not this greeting.
- Intent preservation beats surface-word repair: first infer what the learner was trying to do in the scene, then improve that utterance. If a learner appears to ask for a route, line, stop, platform, transfer, or destination, improvedVersion/referenceSentence must stay a route/boarding question. Do NOT turn it into a price/ticket question or a confirmation line just because one surface word is noisy.
- Public transport examples are illustrative, not fixed templates: malformed traveler questions that contain transport words plus a destination/stop should become a natural learner question about which line/vehicle/stop to use, keeping the same destination. If the exact vehicle or destination is unclear, choose the safest generic Dutch wording that asks for the route, not an unrelated follow-up.
- Destination sanity: in transport scenes, a station/place compound can be an ASR artifact even when it looks like a real token. If the scene context, scenario goals, or learnerSituationSummary point to a different destination/transport concept, correct the destination in improvedVersion/referenceSentence and add a wrongWordDetection for the observed surface token. Do not grammar-polish a nonsensical destination as if it were the user's intended place.
referenceKind: reference_pronunciation if same idea with minimal rewording; more_natural_dutch if you change phrasing for native feel.

dutchLikenessNarrative (required per turn):
- Exactly one learner-facing sentence (max ~320 characters).
- If hasLearnerAudio is false: write ONLY about transcript readability, grammar, and scene-appropriate wording \u2014 never claim how the learner sounded out loud, never mention rhythm, pauses, pronunciation, mumbling, mic, or recording quality.
- If hasLearnerAudio is true: you may describe delivery using ONLY ideas consistent with the Azure summary (never invent numeric audio scores).
- Never include numeric scores in this string.

chunkingRhythmSuggestion:
- MUST be an empty string when hasLearnerAudio is false.
- When hasLearnerAudio is true, base pauses/chunking ONLY on Azure summary timing cues \u2014 never guess from transcript layout alone.

Return ONLY one JSON object (no markdown).`

/** When the coaching model request stalls, still ship a usable report (orchestrator merges audio + recap). */
function shouldUseDeterministicFallbackForCoachingRequestError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  const m = msg.toLowerCase()
  if (m.includes('401') || m.includes('incorrect api key') || m.includes('invalid api key') || m.includes('unauthoriz')) {
    return false
  }
  return (
    m.includes('timed out') ||
    m.includes('timeout') ||
    m.includes('etimedout') ||
    m.includes('econnreset') ||
    m.includes('the operation was aborted') ||
    m.includes('fetch failed') ||
    m.includes('socket hang up') ||
    m.includes('network error')
  )
}

/** Fix common LLM output quirks in-place before Zod validation. */
function coerceLlmResponse(obj: unknown): void {
  if (!obj || typeof obj !== 'object') return
  const o = obj as Record<string, unknown>

  if (typeof o.whatToTryNext === 'string') {
    o.whatToTryNext = [o.whatToTryNext]
  }
  if (!o.whatToTryNext || !Array.isArray(o.whatToTryNext)) {
    o.whatToTryNext = ['Repeat this scenario and focus on covering all goals.']
  }
  if (typeof o.fluencyRhythmSummary !== 'string' || !o.fluencyRhythmSummary) {
    o.fluencyRhythmSummary = 'Not enough data for a rhythm summary this session.'
  }
  if (typeof o.pronunciationSummary !== 'string' || !o.pronunciationSummary) {
    o.pronunciationSummary = 'Not enough data for a pronunciation summary this session.'
  }
  if (typeof o.strongestAreas === 'string') {
    o.strongestAreas = [o.strongestAreas]
  }
  if (typeof o.weakestAreas === 'string') {
    o.weakestAreas = [o.weakestAreas]
  }

  if (Array.isArray(o.turns)) {
    o.turns = (o.turns as unknown[]).filter((t: unknown) => {
      if (typeof t === 'string') return false
      return t && typeof t === 'object'
    })
    for (const turn of o.turns as unknown[]) {
      if (!turn || typeof turn !== 'object') continue
      const t = turn as Record<string, unknown>

      const VALID_ACTION_TYPES = new Set([
        'save_phrase', 'save_pronunciation_word', 'save_rhythm_drill',
        'save_natural_phrasing', 'scenario_follow_up', 'sentence_drill', 'review_queue',
      ])
      if (Array.isArray(t.improvementActions)) {
        t.improvementActions = t.improvementActions.map((a: unknown) => {
          if (typeof a === 'string') {
            return { type: 'save_phrase', title: a.slice(0, 240), detail: a.slice(0, 900) }
          }
          if (a && typeof a === 'object') {
            const act = a as Record<string, unknown>
            if (!act.detail && typeof act.details === 'string') {
              act.detail = act.details
              delete act.details
            }
            if (!act.detail) act.detail = String(act.title ?? '')
            if (!act.type || !VALID_ACTION_TYPES.has(String(act.type))) act.type = 'save_phrase'
          }
          return a
        })
      }
      if (typeof t.keyStrengths === 'string') {
        t.keyStrengths = [t.keyStrengths]
      }
      if (Array.isArray(t.keyStrengths)) {
        t.keyStrengths = t.keyStrengths.map((s: unknown) => typeof s === 'object' && s !== null ? JSON.stringify(s) : typeof s === 'string' ? s : String(s))
      }
      if (typeof t.keyProblems === 'string') {
        t.keyProblems = [t.keyProblems]
      }
      if (Array.isArray(t.keyProblems)) {
        t.keyProblems = t.keyProblems.map((s: unknown) => typeof s === 'object' && s !== null ? JSON.stringify(s) : typeof s === 'string' ? s : String(s))
      }

      if (typeof t.dutchLikenessNarrative !== 'string') {
        t.dutchLikenessNarrative = ''
      }
      if (typeof t.chunkingRhythmSuggestion !== 'string') {
        t.chunkingRhythmSuggestion = ''
      }
      if (!Array.isArray(t.focusWords)) {
        t.focusWords = []
      }
      if (!Array.isArray(t.improvementActions)) {
        t.improvementActions = []
      }

      const VALID_REF_KINDS = new Set(['reference_pronunciation', 'more_natural_dutch'])
      if (typeof t.referenceKind !== 'string' || !VALID_REF_KINDS.has(t.referenceKind)) {
        t.referenceKind = 'reference_pronunciation'
      }

      if (t.scenarioGoalFit && typeof t.scenarioGoalFit === 'object') {
        const sgf = t.scenarioGoalFit as Record<string, unknown>
        if (typeof sgf.alignmentScore !== 'number') sgf.alignmentScore = 50
        if (!Array.isArray(sgf.relevantGoals)) sgf.relevantGoals = []
        if (typeof sgf.summary !== 'string') sgf.summary = ''
      }

      if (t.languageScores && typeof t.languageScores === 'object') {
        const ls = t.languageScores as Record<string, unknown>
        for (const k of ['naturalness', 'contextualFit', 'registerFit', 'grammaticalStability']) {
          if (typeof ls[k] !== 'number') ls[k] = 55
        }
      }

      if (t.turnLanguageEvaluation && typeof t.turnLanguageEvaluation === 'object') {
        const tle = t.turnLanguageEvaluation as Record<string, unknown>
        for (const k of ['grammarScore', 'sentenceConstructionScore', 'naturalnessScore', 'levelFitScore']) {
          if (typeof tle[k] !== 'number') tle[k] = 55
        }
        for (const k of ['whatWorked', 'grammarIssues', 'sentenceStructureIssues']) {
          if (!Array.isArray(tle[k])) tle[k] = []
        }
        if (typeof tle.improvedVersion !== 'string') tle.improvedVersion = ''
        if (typeof tle.whyItIsBetter !== 'string') tle.whyItIsBetter = ''
        if (typeof tle.levelBasedComment !== 'string') tle.levelBasedComment = ''
      }

      if (Array.isArray(t.recommendedFollowUps)) {
        t.recommendedFollowUps = t.recommendedFollowUps.map((f: unknown) => {
          if (typeof f === 'string') {
            return { type: 'phrase_drill', title: f.slice(0, 400), reason: f.slice(0, 1200) }
          }
          return f
        })
      }
    }
  }

  const VALID_FOLLOWUP_TYPES = new Set([
    'pronunciation_drill', 'rhythm_drill', 'phrase_drill', 'natural_phrasing_drill',
    'repeat_scenario', 'library_phrase', 'library_word', 'sentence_drill', 'coach_followup',
  ])
  if (Array.isArray(o.recommendedFollowUps)) {
    o.recommendedFollowUps = o.recommendedFollowUps.map((f: unknown) => {
      if (typeof f === 'string') {
        return { type: 'phrase_drill', title: f.slice(0, 400), reason: f.slice(0, 1200) }
      }
      if (f && typeof f === 'object') {
        const fu = f as Record<string, unknown>
        if (!fu.type || !VALID_FOLLOWUP_TYPES.has(String(fu.type))) fu.type = 'phrase_drill'
        if (typeof fu.title !== 'string') fu.title = ''
        if (typeof fu.reason !== 'string') fu.reason = ''
      }
      return f
    })
  }
  if (!Array.isArray(o.recommendedFollowUps)) {
    o.recommendedFollowUps = []
  }
}

export type LiveEvalLlmTurnInput = {
  turnId: string
  turnIndex: number
  learnerTranscript: string
  /** Normalized / cleaned transcript from live STT when available */
  learnerTranscriptNormalized: string
  assistantReply: string
  hasLearnerAudio: boolean
  /** Scenario goal strings (same for all turns; repeated for turn-local JSON) */
  sessionGoals: string[]
  /** Compact JSON string of Azure + weak words, or null */
  azureSummary: string | null
}

export async function runLiveSessionEvaluationLlm(input: {
  scenarioTitle: string
  /** e.g. `storytelling`, `explaining_something` — drives monologue rewrite rules in the prompt. */
  scenarioSlug?: string | null
  scenarioGoals: string[]
  learnerLevel: string
  recapGoalsCompleted: string[]
  recapGoalsMissed: string[]
  recapWhatWentWell: string[]
  recapWhatToImprove: string[]
  turns: LiveEvalLlmTurnInput[]
  /** Passed only to the structured transcript JSON path. */
  structuredTranscriptEvalOptions?: SpeakLiveStructuredTranscriptEvalOptions
}): Promise<LiveEvalLlmResult> {
  const cred = speakLiveEvalCredentialsReady()
  if (!cred.ok) {
    if (cred.reason === 'mock_provider') {
      console.log('[EvalLLM] AI provider is mock — using deterministic fallback')
      return {
        source: 'deterministic',
        reason: 'AI provider is set to mock.',
        fallbackCode: 'mock_provider',
        data: deterministicLiveEval(input),
      }
    }
    const reasonMsg =
      cred.reason === 'azure_openai_not_configured'
        ? 'Azure OpenAI is not configured for coaching (endpoint or API key missing).'
        : 'No API key configured for the coaching model.'
    console.log('[EvalLLM] credentials missing — using deterministic fallback', cred.reason)
    return {
      source: 'deterministic',
      reason: reasonMsg,
      fallbackCode: 'no_api_key',
      data: deterministicLiveEval(input),
    }
  }

  const providerId = getResolvedAiProviderId()
  console.log(`[EvalLLM] Running real LLM evaluation (provider=${providerId}, turns=${input.turns.length})`)

  if (!isSpeakLiveLegacyTranscriptEvalLlmEnabled()) {
    try {
      const structured = await runSpeakLiveStructuredTranscriptEvaluation(
        {
          scenarioTitle: input.scenarioTitle,
          scenarioSlug: input.scenarioSlug,
          scenarioGoals: input.scenarioGoals,
          learnerLevel: input.learnerLevel,
          recapGoalsCompleted: input.recapGoalsCompleted,
          recapGoalsMissed: input.recapGoalsMissed,
          recapWhatWentWell: input.recapWhatWentWell,
          recapWhatToImprove: input.recapWhatToImprove,
          turns: input.turns,
        },
        input.structuredTranscriptEvalOptions,
      )
      if (structured.source === 'llm') {
        console.log('[EvalLLM] Structured transcript JSON path succeeded')
        return { source: 'llm', data: structured.data }
      }
      console.warn('[EvalLLM] Structured transcript path failed', structured.reason)
    } catch (e) {
      console.warn('[EvalLLM] Structured transcript path threw', e instanceof Error ? e.message : e)
    }
    if (!isSpeakLiveTranscriptEvalLegacyFallbackEnabled()) {
      return {
        source: 'deterministic',
        reason: 'Structured transcript evaluation failed and legacy monolithic fallback is disabled.',
        fallbackCode: 'validation_error',
        data: deterministicLiveEval(input),
      }
    }
    console.log('[EvalLLM] Falling back to legacy monolithic session-eval prompt')
  }

  const model = getSpeakLiveSessionEvaluationModel()
  const slugNorm = (input.scenarioSlug ?? '').trim().toLowerCase().replace(/-/g, '_')
  const monologueSlug = slugNorm === 'storytelling' || slugNorm === 'explaining_something'
  const userPayload = JSON.stringify(
    { ...input, scenarioSlug: slugNorm || input.scenarioSlug },
    null,
    0,
  ).slice(0, 48_000)
  const timeoutMs = getSpeakLiveEvaluationAiRequestTimeoutMs()
  const maxRetries = getSpeakLiveEvaluationAiMaxRetries()
  console.log('[EvalLLM] Request config', {
    model,
    timeoutMs,
    maxRetries,
    userPayloadChars: userPayload.length,
  })

  const monologueUserHint = monologueSlug
    ? `\n\nScenario slug: ${slugNorm}\nApply the **Storytelling / explaining_something monologues** rules from the system prompt on every long learner turn: full-turn improvedVersion, short mainFixLine hook.\nBefore finalizing each such turn, verify improvedVersion still reflects the **last sentence(s)** of learnerTranscript (current role, outcome, punchline) \u2014 not only the opening.`
    : ''

  const userMessageContent = `Return JSON with keys: overallCoachSummary, optional grammarConstructionSessionSummary,
fluencyRhythmSummary, pronunciationSummary, whatToTryNext,
optional strongestAreas[], weakestAreas[], mostImportantNextStep, savedTrainingRecommendationsSummary,
turns, recommendedFollowUps.

Each turns[] object MUST include:
turnId, referenceSentence, referenceKind, referenceSentenceReason,
scenarioGoalFit: { summary, alignmentScore, relevantGoals },
languageScores: { naturalness, contextualFit, registerFit, grammaticalStability },
keyStrengths, keyProblems, chunkingRhythmSuggestion, focusWords, dutchLikenessNarrative, improvementActions,
turnLanguageEvaluation: {
  grammarScore, sentenceConstructionScore, naturalnessScore, levelFitScore,
  whatWorked[], grammarIssues[], sentenceStructureIssues[],
  optional wordOrderNotes[], optional questionFormNotes[], optional verbTenseNotes[], optional agreementNotes[],
  improvedVersion, whyItIsBetter, optional whyThisIsMoreNatural, levelBasedComment,
  optional learnerFacingGrammarLine, optional nextPatternToPractice, optional nextStepBeyondLevel
}.

CEFR level for referenceSentence tone: ${input.learnerLevel}

Scenario title: ${input.scenarioTitle}
Scenario goals: ${JSON.stringify(input.scenarioGoals)}
Recap goals completed: ${JSON.stringify(input.recapGoalsCompleted)}
Recap goals missed: ${JSON.stringify(input.recapGoalsMissed)}
What went well (recap): ${JSON.stringify(input.recapWhatWentWell)}
What to improve (recap): ${JSON.stringify(input.recapWhatToImprove)}

Turn facts (use verbatim turnId):
${userPayload}${monologueUserHint}`

  let raw: string
  try {
    raw = await runSpeakLiveEvalChatCompletion({
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userMessageContent },
      ],
      maxOutputTokens: 5000,
      temperature: 0.22,
      jsonResponseFormat: true,
      openAiModel: model,
      azureDeployment: getAzureOpenAiSpeakLiveSessionEvalDeployment(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[EvalLLM] Request failed', {
      model,
      timeoutMs,
      maxRetries,
      error: msg,
    })
    if (shouldUseDeterministicFallbackForCoachingRequestError(e)) {
      console.warn('[EvalLLM] Using deterministic evaluation after coaching request error (user can retry from UI)')
      return {
        source: 'deterministic',
        reason:
          'The coaching model did not finish in time or the connection dropped. This report uses a simplified template — tap Try again to re-run when your network is stable.',
        fallbackCode: 'timeout_or_network',
        data: deterministicLiveEval(input),
      }
    }
    throw new Error(`Speak Live report coaching model failed: ${msg}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw.trim().replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/i, ''))
  } catch (e) {
    console.warn('[EvalLLM] JSON parse failed — falling back to deterministic', e)
    return {
      source: 'deterministic',
      reason: 'The coaching model returned an unparseable response.',
      fallbackCode: 'parse_error',
      data: deterministicLiveEval(input),
    }
  }

  coerceLlmResponse(parsed)

  const r = LiveEvalLlmSessionSchema.safeParse(parsed)
  if (!r.success) {
    const issues = r.error.issues.slice(0, 8).map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    console.warn('[EvalLLM] Zod validation failed — falling back to deterministic', issues)
    return {
      source: 'deterministic',
      reason: `The coaching model returned an incomplete response. [Debug: ${issues}]`,
      fallbackCode: 'validation_error',
      data: deterministicLiveEval(input),
    }
  }
  console.log('[EvalLLM] LLM evaluation completed successfully')
  return { source: 'llm', data: r.data }
}

/** Intentional fallback copy — avoid substrings matched by `PLACEHOLDER_RE` in `liveSessionEvaluationQa.ts` or report QA fails on publish. */
function deterministicLiveEval(input: {
  scenarioTitle: string
  scenarioGoals: string[]
  learnerLevel: string
  turns: LiveEvalLlmTurnInput[]
}): LiveEvalLlmSession {
  const sessionHasAudio = input.turns.some((t) => t.hasLearnerAudio)
  const scene = input.scenarioTitle || 'this scenario'
  const lvl = input.learnerLevel || 'your level'

  const turns: LiveEvalLlmTurn[] = input.turns.map((t) => {
    const tx = t.learnerTranscript.trim()
    return {
      turnId: t.turnId,
      referenceSentence: tx || '\u2026',
      referenceKind: 'reference_pronunciation' as const,
      referenceSentenceReason: tx
        ? 'This mirrors your sentence. Retry the scenario for a more natural Dutch alternative.'
        : 'No transcript available for this turn.',
      scenarioGoalFit: {
        summary: tx
          ? `This sentence contributes to the ${scene} scenario.`
          : 'No transcript was captured for this turn.',
        alignmentScore: 55,
        relevantGoals: input.scenarioGoals.length > 0 ? input.scenarioGoals : [],
      },
      languageScores: {
        naturalness: 58,
        contextualFit: 56,
        registerFit: 58,
        grammaticalStability: 58,
      },
      keyStrengths: tx
        ? ['You used Dutch for this moment in the conversation.']
        : [],
      // Leave empty when we have a transcript — `keyProblems` feeds MAIN FIX via report enrichment and must stay learner-facing.
      keyProblems: tx ? [] : ['No transcript was captured for this turn.'],
      chunkingRhythmSuggestion: '',
      focusWords: [],
      dutchLikenessNarrative: tx
        ? t.hasLearnerAudio
          ? 'Your recording was captured. Run the scenario again later if you want richer pronunciation notes from that clip.'
          : 'This feedback is based on your text only \u2014 no recording was stored for this sentence.'
        : '',
      improvementActions: [
        {
          type: 'save_phrase' as const,
          title: `Save: "${(tx || '\u2026').slice(0, 36)}${tx.length > 36 ? '\u2026' : ''}"`,
          detail: `Save this phrase from ${scene} for practice.`,
          targetPhrase: tx || undefined,
        },
        {
          type: 'scenario_follow_up' as const,
          title: `Retry ${scene}`,
          detail: 'Repeat this scenario to get full coaching feedback.',
        },
      ],
      turnLanguageEvaluation: {
        grammarScore: 58,
        sentenceConstructionScore: 58,
        naturalnessScore: 58,
        levelFitScore: 58,
        whatWorked: tx
          ? [`You attempted Dutch in the ${scene} scenario.`]
          : [],
        grammarIssues: [],
        sentenceStructureIssues: [],
        improvedVersion: tx || '\u2026',
        whyItIsBetter: tx
          ? 'Retry the scenario for a detailed comparison with a more natural Dutch version.'
          : '',
        levelBasedComment: `Scored against ${lvl} expectations.`,
        wordOrderNotes: [],
        nextStepBeyondLevel: `For ${lvl}: try adding short connector phrases and practise question word order.`,
        whyThisIsMoreNatural: '',
        nextPatternToPractice: 'Short polite opener + clear object (e.g. "Ik wil graag \u2026").',
        learnerFacingGrammarLine: `Your meaning comes through for ${lvl}. Retry for more specific grammar notes.`,
        questionFormNotes: [],
        verbTenseNotes: [],
        agreementNotes: [],
      },
    }
  })

  return {
    overallCoachSummary: `You practised ${scene} at ${lvl} with ${input.turns.length} sentence${input.turns.length === 1 ? '' : 's'}. Retry this scenario for detailed coaching.`,
    grammarConstructionSessionSummary: 'Grammar review is available when you retry this scenario.',
    fluencyRhythmSummary: sessionHasAudio
      ? 'Your recording was captured. Run the scenario again later if you want richer rhythm and pacing notes from that clip.'
      : 'No recording was stored for this session, so rhythm and pacing could not be reviewed.',
    pronunciationSummary: sessionHasAudio
      ? 'Your recording was captured. Run the scenario again later if you want richer pronunciation notes from that clip.'
      : 'No recording was stored for this session, so pronunciation could not be reviewed.',
    whatToTryNext: [
      `Retry ${scene} for full feedback.`,
      'Shadow one native reference line slowly, then at natural speed.',
    ],
    strongestAreas: ['Willingness to use Dutch in a real scenario'],
    weakestAreas: sessionHasAudio
      ? ['Retry to get detailed weak-area analysis']
      : ['Record your voice next time for pronunciation feedback'],
    mostImportantNextStep: `Retry ${scene} for detailed coaching on your sentences.`,
    savedTrainingRecommendationsSummary: 'Save one target phrase per turn for practice.',
    turns,
    recommendedFollowUps: [
      {
        type: 'repeat_scenario',
        title: `Retry ${scene}`,
        reason: 'Repeat this scenario to get full language and voice coaching.',
        linkedScenarioIdOptional: null,
        linkedPhraseOptional: null,
        linkedWordOptional: null,
      },
    ],
  }
}

/** Exported for parallel orchestration when the structured LLM lane fails independently of Azure. */
export function buildDeterministicLiveEvalLlmResult(params: {
  scenarioTitle: string
  scenarioGoals: string[]
  learnerLevel: string
  turns: LiveEvalLlmTurnInput[]
  reason: string
  fallbackCode: SpeakLiveCoachingFallbackCode
}): LiveEvalLlmResult {
  return {
    source: 'deterministic',
    reason: params.reason,
    fallbackCode: params.fallbackCode,
    data: deterministicLiveEval({
      scenarioTitle: params.scenarioTitle,
      scenarioGoals: params.scenarioGoals,
      learnerLevel: params.learnerLevel,
      turns: params.turns,
    }),
  }
}
