import type {
  LiveSessionEvaluation,
  TurnEvaluation,
} from '../../../services/speak-live/liveVoiceEvaluationTypes'
import {
  dedupeEvidenceItems,
  mapIssueConfidence,
  mapIssueSeverity,
  mapPronunciationIssueFamily,
  normalizePatternId,
  normalizePronunciationTarget,
  normalizeWordKey,
} from '../learningInsightNormalization'
import {
  extractHesitationFromTurn,
  hesitationDeltaToIssues,
  mergeHesitationDeltas,
} from '../sessionInsightHesitationBuilder'
import type {
  HesitationDelta,
  SessionInsightHesitation,
  SessionInsightPronunciation,
  SessionInsightStrength,
  SessionInsightWeakPattern,
  SessionInsightWeakWord,
} from '../sessionLearningInsightTypes'
import type { ScenarioPerformanceSummary, Score01 } from '../userLearningProfileDocument'

export type LiveSpeakingInsightChunk = {
  weakWords: SessionInsightWeakWord[]
  weakPatterns: SessionInsightWeakPattern[]
  pronunciationIssues: SessionInsightPronunciation[]
  hesitationDeltas: HesitationDelta[]
  strengths: SessionInsightStrength[]
  scenarioPerformance: ScenarioPerformanceSummary | null
  confidenceParts: string[]
}

function pushWeakWord(
  bucket: SessionInsightWeakWord[],
  display: string,
  category: string,
  source: string,
  severityHints: { numeric?: number | null; label?: string | null; unclear?: boolean },
  confidence: Score01,
  refs: string[],
  supportingText?: string | null,
): void {
  const w = display.trim()
  if (w.length < 2 || w.length > 120) return
  const sev = mapIssueSeverity(severityHints)
  bucket.push({
    normalizedKey: normalizeWordKey(w),
    displayText: w.slice(0, 200),
    category,
    source,
    severity: sev,
    severityScore: sev,
    confidence,
    evidenceRefs: dedupeEvidenceItems(refs),
    supportingText: supportingText ?? null,
  })
}

function pushPattern(
  bucket: SessionInsightWeakPattern[],
  label: string,
  explanation: string | null,
  source: string,
  severityHints: { numeric?: number | null; label?: string | null },
  confidence: Score01,
  refs: string[],
  supportingText?: string | null,
): void {
  const humanLabel = label.trim().slice(0, 200)
  if (!humanLabel) return
  const sev = mapIssueSeverity(severityHints)
  const patternId = normalizePatternId(humanLabel)
  bucket.push({
    patternId,
    label: humanLabel.slice(0, 120),
    explanation,
    source,
    severity: sev,
    severityScore: sev,
    confidence,
    evidenceRefs: dedupeEvidenceItems(refs),
    supportingText: supportingText ?? null,
  })
}

function pushPronunciation(
  bucket: SessionInsightPronunciation[],
  word: string,
  issueFamily: string,
  source: string,
  severityHints: { numeric?: number | null; label?: string | null; unclear?: boolean },
  confidence: Score01,
  refs: string[],
  transcriptOnly: boolean,
  supportingText?: string | null,
): void {
  const fam = mapPronunciationIssueFamily(issueFamily)
  const conf = transcriptOnly ? confidence * 0.72 : confidence
  const sev = mapIssueSeverity(severityHints)
  bucket.push({
    targetKey: normalizePronunciationTarget(word, fam),
    issueType: fam,
    source,
    severity: sev,
    severityScore: sev,
    confidence: Math.min(0.95, conf) as Score01,
    evidenceRefs: dedupeEvidenceItems(refs),
    supportingText: supportingText ?? null,
  })
}

function pushStrength(
  bucket: SessionInsightStrength[],
  label: string,
  source: string,
  confidence: Score01,
  refs: string[],
  supportingText?: string | null,
): void {
  const t = label.trim().slice(0, 220)
  if (t.length < 2) return
  const sev = Math.min(3, Math.max(1, Math.round(1 + confidence * 2)))
  bucket.push({
    label: t,
    source,
    severity: sev,
    severityScore: sev,
    confidence,
    evidenceRefs: dedupeEvidenceItems(refs),
    supportingText: supportingText ?? null,
  })
}

function confidenceFromEvalLevel(level: 'high' | 'medium' | 'low' | null | undefined, audioBacked: boolean): Score01 {
  return mapIssueConfidence({ level: level ?? 'medium', audioBacked })
}

function buildConfidenceParts(ev: LiveSessionEvaluation): string[] {
  const es = ev.evidenceSummary
  const parts: string[] = []
  if (es) {
    parts.push(`audioTurns=${es.audioTurnCount ?? 0}`)
    parts.push(`transcriptTurns=${es.transcriptTurnCount ?? 0}`)
    parts.push(`azurePA=${es.azurePronunciationTurnCount ?? 0}`)
  }
  return parts.length ? [`live:${parts.join(';')}`] : ['live:summary_unavailable']
}

export function extractLiveSpeakingSessionInsightChunk(params: {
  scenarioId: string | null
  scenarioSlug: string | null
  evaluation: LiveSessionEvaluation
  sessionId: string
}): LiveSpeakingInsightChunk {
  const ev = params.evaluation
  const weakWords: SessionInsightWeakWord[] = []
  const weakPatterns: SessionInsightWeakPattern[] = []
  const pronunciationIssues: SessionInsightPronunciation[] = []
  const hesitationDeltas: HesitationDelta[] = []
  const strengths: SessionInsightStrength[] = []
  const extractedAt = new Date().toISOString()

  const ingestTurn = (t: TurnEvaluation) => {
    const audioBacked = Boolean(t.originalAudioUrl && t.audioCoaching)
    const tcConf = confidenceFromEvalLevel(t.transcriptConfidence ?? 'medium', false)
    const acConf = confidenceFromEvalLevel(t.audioCoaching?.confidence ?? 'medium', audioBacked)
    const turnRef = `turn:${t.turnId}`

    for (const issue of t.transcriptCoaching?.issues ?? []) {
      const lab = `${issue.area}: ${issue.issue}`.trim()
      pushPattern(
        weakPatterns,
        lab,
        issue.fix ?? null,
        'live_transcript_coaching',
        { label: 'medium' },
        tcConf * 0.95,
        [turnRef, 'transcript_issue'],
        issue.fix ?? null,
      )
    }
    if (t.transcriptCoaching?.patternToReuse?.trim()) {
      pushPattern(
        weakPatterns,
        `Reuse pattern: ${t.transcriptCoaching.patternToReuse.trim()}`,
        null,
        'live_transcript_coaching',
        { label: 'low' },
        tcConf * 0.85,
        [turnRef, 'pattern_reuse'],
        null,
      )
    }

    for (const line of t.transcriptCoaching?.strengths ?? []) {
      if (line?.trim()) {
        pushStrength(strengths, line, 'live_transcript_coaching_strength', tcConf * 0.9, [turnRef, 'transcript_strength'], null)
      }
    }
    for (const line of t.keyStrengths ?? []) {
      if (line?.trim()) {
        pushStrength(strengths, line, 'live_turn_key_strength', tcConf * 0.82, [turnRef, 'key_strength'], null)
      }
    }

    for (const w of t.audioCoaching?.evidence?.weakWords ?? []) {
      pushWeakWord(
        weakWords,
        w,
        'pronunciation_weak_word',
        'live_azure_weak_words',
        { label: 'medium' },
        acConf * 0.9,
        [turnRef, 'azure_weak_word'],
        null,
      )
    }
    for (const seg of t.audioCoaching?.evidence?.stressIssues ?? []) {
      const token = typeof seg === 'string' ? seg : String(seg)
      if (token.trim()) {
        pushPronunciation(
          pronunciationIssues,
          token,
          'stress',
          'live_azure_stress_evidence',
          { label: 'medium' },
          acConf * 0.78,
          [turnRef, 'stress_issue'],
          false,
          token,
        )
      }
    }

    for (const wa of t.audioCoaching?.wordAssessments ?? []) {
      if (wa.status === 'weak' || wa.status === 'unclear') {
        pushWeakWord(
          weakWords,
          wa.word,
          wa.issueType ?? 'pronunciation',
          'live_word_assessment',
          { label: wa.status === 'unclear' ? 'high' : 'medium', unclear: wa.status === 'unclear' },
          acConf * 0.88,
          [turnRef, 'word_assessment'],
          wa.instruction,
        )
        pushPronunciation(
          pronunciationIssues,
          wa.word,
          wa.issueType ?? 'unknown',
          'live_word_assessment',
          { label: wa.status === 'unclear' ? 'high' : 'medium', unclear: wa.status === 'unclear' },
          acConf * 0.9,
          [turnRef, 'word_assessment'],
          !audioBacked,
          wa.instruction,
        )
      }
    }

    const azEval = t.azureSpeechEvaluation
    if (azEval?.version === 1) {
      const azConf = mapIssueConfidence({ level: 'high', audioBacked: true }) * 0.92
      for (const w of azEval.weakWords ?? []) {
        pushWeakWord(
          weakWords,
          w,
          'azure_weak_word',
          'live_azure_speech_weak_words',
          { label: 'medium' },
          azConf * 0.9,
          [turnRef, 'azure_weak_word'],
          null,
        )
      }
      for (const pi of azEval.phonemeIssues ?? []) {
        const word = pi.word?.trim()
        if (!word) continue
        pushPronunciation(
          pronunciationIssues,
          word,
          `phoneme:${pi.phoneme}`,
          'live_azure_speech_phoneme',
          { label: pi.accuracyScore < 60 ? 'high' : 'medium' },
          azConf * 0.94,
          [turnRef, 'azure_phoneme'],
          false,
          `phoneme /${pi.phoneme}/ (${Math.round(pi.accuracyScore)})`,
        )
      }
      const pd = azEval.pacingDetail
      if (pd?.rushedEnding) {
        pushPattern(
          weakPatterns,
          'Rushed phrase ending',
          'Try a short breath before the last stressed syllable so the ending lands clearly.',
          'live_azure_speech_pacing',
          { label: 'medium' },
          azConf * 0.72,
          [turnRef, 'azure_rushed_ending'],
          null,
        )
      }
      if (pd && pd.pauseCount >= 4 && pd.avgPauseMs >= 500) {
        pushPattern(
          weakPatterns,
          'Hesitation / long pauses while speaking',
          `Avg pause ~${Math.round(pd.avgPauseMs)} ms across ${pd.pauseCount} pauses — chunk the next line into two beats.`,
          'live_azure_speech_hesitation',
          { label: 'medium' },
          azConf * 0.68,
          [turnRef, 'azure_long_pauses'],
          null,
        )
      }
    }

    for (const pi of t.pronunciationIssues ?? []) {
      const prConf = audioBacked ? acConf : tcConf * 0.65
      pushPronunciation(
        pronunciationIssues,
        pi.word,
        pi.issue,
        'live_turn_pronunciation_issue',
        { numeric: pi.score < 50 ? 3 : pi.score < 70 ? 2 : 1 },
        prConf * 0.75,
        [turnRef, 'pronunciation_issue'],
        !audioBacked,
        `${pi.issue} → ${pi.fix}`.slice(0, 280),
      )
    }

    for (const ww of t.wrongWordDetections ?? []) {
      const observed = ww.observedToken?.trim()
      const suggested = ww.suggestedCorrection?.trim()
      const practiceWord = suggested || observed
      if (!practiceWord) continue
      const supporting =
        observed && suggested && observed.toLowerCase() !== suggested.toLowerCase()
          ? `You said “${observed}” — practice “${suggested}”. ${ww.whyItMatters ?? ''}`.trim()
          : ww.whyItMatters
      pushWeakWord(
        weakWords,
        practiceWord,
        suggested ? 'word_choice_correction' : `wrong_word:${ww.classification}`,
        'live_wrong_word_detection',
        { label: ww.severity, unclear: Boolean(ww.uncertainHearing) },
        tcConf * (ww.uncertainHearing ? 0.45 : 0.62),
        [turnRef, 'wrong_word'],
        supporting,
      )
      if (suggested) {
        pushPattern(
          weakPatterns,
          `Word choice: ${ww.classification}`,
          `Better: ${suggested}`.slice(0, 240),
          'live_wrong_word_detection',
          { label: ww.severity },
          tcConf * 0.55,
          [turnRef, 'wrong_word_pattern'],
          ww.whyItMatters,
        )
      }
    }

    for (const fb of t.feedbackItems ?? []) {
      const token = fb.evidence?.word ?? fb.evidence?.phrase ?? ''
      const audioFb = fb.source === 'audio'
      if (token.trim()) {
        pushWeakWord(
          weakWords,
          token,
          fb.type ?? 'feedback',
          'live_feedback_item',
          { label: 'medium' },
          mapIssueConfidence({
            level: 'medium',
            audioBacked: audioFb,
            transcriptOnlyPenalty: audioFb ? 1 : 0.7,
          }) * 0.85,
          [turnRef, 'feedback_item'],
          fb.explanation?.slice(0, 240) ?? null,
        )
      }
      const lab = `${fb.type}: ${fb.issue}`.trim()
      pushPattern(
        weakPatterns,
        lab,
        fb.explanation ?? null,
        'live_feedback_pattern',
        { label: 'medium' },
        tcConf * 0.8,
        [turnRef, 'feedback_pattern'],
        fb.fix?.slice(0, 200) ?? null,
      )
    }

    hesitationDeltas.push(extractHesitationFromTurn(t))

    const sgr = t.sentenceGroundedReview
    if (sgr) {
      for (const w of sgr.whatWorked ?? []) {
        if (w?.trim()) pushStrength(strengths, w, 'live_sentence_review', tcConf * 0.88, [turnRef, 'sentence_what_worked'], null)
      }
      for (const w of sgr.whatToFix ?? []) {
        if (w?.trim()) {
          pushPattern(
            weakPatterns,
            w,
            sgr.mainFix ?? null,
            'live_sentence_review',
            { label: 'medium' },
            tcConf * 0.8,
            [turnRef, 'sentence_what_to_fix'],
            sgr.nativePhrase ?? null,
          )
        }
      }
      if (sgr.pattern?.trim()) {
        pushPattern(
          weakPatterns,
          `Sentence pattern: ${sgr.pattern.trim()}`,
          sgr.whyBetter ?? null,
          'live_sentence_review',
          { label: 'medium' },
          tcConf * 0.78,
          [turnRef, 'sentence_pattern'],
          null,
        )
      }
    }
  }

  for (const t of ev.turnEvaluations ?? []) ingestTurn(t)

  const debrief = ev.languageCoachDebrief
  if (debrief?.weakPatterns?.length) {
    for (const p of debrief.weakPatterns.slice(0, 14)) {
      pushPattern(weakPatterns, p, null, 'live_language_coach_debrief', { label: 'medium' }, 0.62, ['debrief', 'weak_pattern'], null)
    }
  }
  if (debrief?.strengths?.length) {
    for (const s of debrief.strengths.slice(0, 14)) {
      if (s?.trim()) pushStrength(strengths, s, 'live_language_coach_debrief', 0.66, ['debrief', 'strength'], null)
    }
  }

  if (ev.focusArea?.label?.trim()) {
    pushPattern(
      weakPatterns,
      `Session focus: ${ev.focusArea.label.trim()}`,
      ev.focusArea.why ?? null,
      'live_report_focus_area',
      { label: 'high' },
      0.68,
      ['session', 'focus_area'],
      ev.focusArea.exampleLine ?? null,
    )
  }

  if (ev.scenarioOutcome?.whatWentWell?.length) {
    for (const w of ev.scenarioOutcome.whatWentWell.slice(0, 10)) {
      if (w?.trim()) pushStrength(strengths, w, 'live_scenario_outcome', 0.58, ['session', 'scenario_what_went_well'], null)
    }
  }

  const sessInsights = ev.sessionInsights
  if (sessInsights?.strongestAreas?.length) {
    for (const a of sessInsights.strongestAreas.slice(0, 8)) {
      if (a?.trim()) pushStrength(strengths, a, 'live_session_insights', 0.6, ['session', 'session_insights_strong'], null)
    }
  }
  if (sessInsights?.weakestAreas?.length) {
    for (const a of sessInsights.weakestAreas.slice(0, 6)) {
      if (a?.trim()) {
        pushPattern(weakPatterns, `Session relative gap: ${a}`, null, 'live_session_insights', { label: 'medium' }, 0.52, ['session', 'session_insights_weak'], null)
      }
    }
  }
  if (sessInsights?.mostImportantNextStep?.trim()) {
    pushPattern(
      weakPatterns,
      `Next step: ${sessInsights.mostImportantNextStep.trim().slice(0, 100)}`,
      null,
      'live_session_insights',
      { label: 'medium' },
      0.55,
      ['session', 'next_step'],
      null,
    )
  }

  for (const act of ev.recommendedActions?.slice(0, 6) ?? []) {
    if (act.title?.trim()) {
      pushPattern(
        weakPatterns,
        `Recommended action: ${act.title.trim()}`,
        act.reason ?? null,
        'live_recommended_action',
        { label: act.priority === 'primary' ? 'high' : 'low' },
        0.48,
        ['session', `action:${act.type}`],
        null,
      )
    }
  }

  const merged = ev.mergedSpeakingReportV1
  if (merged?.version === 1) {
    const mConf = 0.64 as Score01
    const sig = merged.adaptiveLearningSignalsV1
    for (const p of sig.weakPatterns.slice(0, 14)) {
      if (p?.trim()) {
        pushPattern(
          weakPatterns,
          p.trim(),
          null,
          'merged_speaking_report_v1',
          { label: 'medium' },
          mConf,
          ['merged', 'weak_pattern'],
          null,
        )
      }
    }
    for (const pi of sig.pronunciationIssues.slice(0, 12)) {
      const word = pi.split(/[—:]/)[0]?.trim() ?? ''
      if (word.length >= 2) {
        pushPronunciation(
          pronunciationIssues,
          word,
          'merged_report',
          'merged_speaking_report_v1',
          { label: 'medium' },
          mConf * 0.9,
          ['merged', 'pronunciation'],
          false,
          pi.slice(0, 200),
        )
      }
    }
    for (const g of sig.vocabularyGaps.slice(0, 14)) {
      const arrowParts = g.includes('→') ? g.split('→') : g.includes('->') ? g.split('->') : null
      const observed = arrowParts?.[0]?.trim() ?? ''
      const suggested = arrowParts && arrowParts.length >= 2 ? arrowParts.slice(1).join('→').trim() : ''
      const token = (suggested || observed || g).trim()
      if (token.length >= 2) {
        pushWeakWord(
          weakWords,
          token,
          'vocabulary_gap',
          'merged_speaking_report_v1',
          { label: 'medium' },
          mConf * 0.85,
          ['merged', 'vocab_gap'],
          observed && suggested ? `You said “${observed}” — practice “${suggested}”.` : g.slice(0, 220),
        )
      }
    }
    for (const line of sig.pacingIssues.slice(0, 8)) {
      if (line?.trim()) {
        pushPattern(
          weakPatterns,
          line.trim(),
          null,
          'merged_speaking_report_v1',
          { label: 'low' },
          mConf * 0.72,
          ['merged', 'pacing'],
          null,
        )
      }
    }
  }

  const slug =
    params.scenarioSlug ?? (ev.scenarioId?.includes('-') ? ev.scenarioId : null) ?? null
  const score =
    typeof ev.taskOutcome?.weightedCompletion === 'number'
      ? ev.taskOutcome.weightedCompletion
      : typeof ev.overall?.overallScore === 'number'
        ? ev.overall.overallScore
        : null
  const weakDims = (ev.overall?.dimensions ?? [])
    .filter((d) => typeof d.score === 'number' && d.score < 72 && d.confidence !== 'low')
    .map((d) => d.label)
    .slice(0, 6)
  const strongDims = (ev.overall?.dimensions ?? [])
    .filter((d) => typeof d.score === 'number' && d.score >= 78)
    .map((d) => d.label)
    .slice(0, 4)

  for (const d of strongDims) {
    pushStrength(strengths, d, 'live_overall_dimension', 0.62, ['session', 'overall_dimension'], null)
  }

  const scenarioPerformance: ScenarioPerformanceSummary | null = ev.scenarioId
    ? {
        scenarioId: ev.scenarioId,
        scenarioSlug: slug,
        attempts: 1,
        rollingScore: score,
        recentScore: score,
        confidence: 0.55,
        strongSubskills: strongDims,
        weakSubskills: weakDims,
        lastAttemptAt: extractedAt,
      }
    : null

  const confidenceParts = buildConfidenceParts(ev)

  return {
    weakWords,
    weakPatterns,
    pronunciationIssues,
    hesitationDeltas,
    strengths,
    scenarioPerformance,
    confidenceParts,
  }
}

export function finalizeLiveHesitationIssues(
  deltas: HesitationDelta[],
  scenarioId: string | null,
  sessionId: string,
): SessionInsightHesitation[] {
  const merged = mergeHesitationDeltas(deltas)
  const has = Object.values(merged).some((n) => (n ?? 0) > 0)
  return hesitationDeltaToIssues(has ? merged : null, scenarioId, sessionId, {
    source: 'live_audio_timing_aggregate',
    baseConfidence: 0.42,
  })
}
