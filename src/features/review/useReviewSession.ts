'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { ensureMasteryRow, localReviewPersistence } from '@/lib/review-engine/reviewPersistence'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { planReviewSession } from '@/lib/review-engine/reviewSessionPlanner'
import { scoreReview, applyHintPenalty, applySpeakingPenalty } from '@/lib/review-engine/scheduler'
import { updateMasteryFromReviewResult } from '@/lib/review-engine/mastery'
import { recordReviewSessionComplete } from '@/lib/retention/retentionService'
import type { SessionCompleteMeta } from '@/lib/retention/retentionService'
import { recordMistakeEvent } from '@/lib/mistakes/mistakeTagger'
import type { ReviewSessionCard, ReviewSessionMode } from '@/lib/review-engine/types'
import type { SrsItem } from '@/lib/schemas/srsItem.schema'
import type { ReviewCardPayload } from '@/components/review/ReviewCard'
import { seedReviewDemoData } from '@/lib/review-engine/demoSeed'
import { refreshProgressAfterDomainWrite } from '@/lib/persistence'

function upsertSrs(rows: SrsItem[], row: SrsItem): SrsItem[] {
  const i = rows.findIndex((r) => r.id === row.id)
  if (i === -1) return [...rows, row]
  const n = [...rows]
  n[i] = row
  return n
}

export function useReviewSession(opts: {
  mode: ReviewSessionMode
  moduleId?: string
  targetSize?: number
}) {
  const userId = getRetentionUserId()
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [cards, setCards] = useState<ReviewSessionCard[]>([])
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<{ correct: boolean } | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [done, setDone] = useState(false)
  const [sessionMeta, setSessionMeta] = useState<SessionCompleteMeta | null>(null)
  const sessionStarted = useRef(false)
  const statsRef = useRef({ correct: 0, wrong: 0 })

  const reload = useCallback(async () => {
    setLoading(true)
    sessionStarted.current = false
    setSessionMeta(null)
    statsRef.current = { correct: 0, wrong: 0 }
    try {
      const { cards: next } = await planReviewSession(localReviewPersistence, {
        userId,
        mode: opts.mode,
        moduleId: opts.moduleId,
        targetSize: opts.targetSize ?? 12,
        seed: 42,
      })
      setCards(next)
      setIndex(0)
      setCorrectCount(0)
      setWrongCount(0)
      setDone(next.length === 0)
      setFeedback(null)
    } finally {
      setLoading(false)
    }
  }, [opts.mode, opts.moduleId, opts.targetSize, userId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (loading || cards.length === 0 || sessionStarted.current) return
    sessionStarted.current = true
    track(ANALYTICS_EVENTS.review_session_started, {
      mode: opts.mode,
      moduleId: opts.moduleId,
      cardCount: cards.length,
    })
    track(ANALYTICS_EVENTS.review_started, {
      mode: opts.mode,
      moduleId: opts.moduleId,
      cardCount: cards.length,
    })
  }, [loading, cards.length, opts.mode, opts.moduleId])

  const loadDemo = useCallback(async () => {
    setSeeding(true)
    try {
      await seedReviewDemoData(localReviewPersistence, userId)
      await reload()
    } finally {
      setSeeding(false)
    }
  }, [reload, userId])

  const telemetry = useCallback(
    (event: 'card_started' | 'hint_used') => {
      const card = cards[index]
      if (!card) return
      if (event === 'card_started') {
        track(ANALYTICS_EVENTS.review_card_started, {
          reviewItemId: card.reviewItemId,
          uiMode: card.uiMode,
        })
      }
      if (event === 'hint_used') {
        track(ANALYTICS_EVENTS.review_hint_used, { reviewItemId: card.reviewItemId })
      }
    },
    [cards, index]
  )

  const submitCard = useCallback(
    async (payload: ReviewCardPayload) => {
      const card = cards[index]
      if (!card) return

      let score = payload.score
      if (payload.hintUsed) score = applyHintPenalty(score)
      if (card.uiMode === 'speaking' && payload.speakingConfidence !== undefined) {
        score = applySpeakingPenalty(score, payload.speakingConfidence)
      }

      const correct = score >= 3
      setFeedback({ correct })
      if (correct) {
        statsRef.current.correct++
        setCorrectCount(statsRef.current.correct)
      } else {
        statsRef.current.wrong++
        setWrongCount(statsRef.current.wrong)
      }

      const answerProps = {
        reviewItemId: card.reviewItemId,
        score,
        hintUsed: payload.hintUsed,
      }
      track(ANALYTICS_EVENTS.review_answer_submitted, answerProps)
      track(ANALYTICS_EVENTS.review_card_answered, answerProps)
      if (correct) {
        track(ANALYTICS_EVENTS.review_answer_correct, { reviewItemId: card.reviewItemId })
        if (payload.hintUsed) {
          track(ANALYTICS_EVENTS.review_card_recovered, { reviewItemId: card.reviewItemId })
        }
        if (score >= 4) track(ANALYTICS_EVENTS.mastery_improved, { reviewItemId: card.reviewItemId })
      } else {
        track(ANALYTICS_EVENTS.review_answer_incorrect, { reviewItemId: card.reviewItemId })
        track(ANALYTICS_EVENTS.review_card_failed, { reviewItemId: card.reviewItemId })
      }

      const srsList = await localReviewPersistence.loadSrsItems(userId)
      const srs = srsList.find((s) => s.id === card.srsItemId)
      if (srs) {
        const nextSrs = scoreReview(srs, score)
        await localReviewPersistence.saveSrsItems(userId, upsertSrs(srsList, nextSrs))
      }

      const masteryRow = await ensureMasteryRow(localReviewPersistence, userId)
      const prevLemma = card.lemmaKey ? masteryRow.vocabMasteryMap[card.lemmaKey] : undefined
      const mastery = updateMasteryFromReviewResult(masteryRow, {
        itemType: card.itemType,
        lemmaKey: card.lemmaKey,
        grammarKey: card.grammarKey,
        effectiveScore: score,
      })
      if (card.lemmaKey && prevLemma !== undefined && (mastery.vocabMasteryMap[card.lemmaKey] ?? 0) > prevLemma) {
        track(ANALYTICS_EVENTS.mastery_improved, { lemma: card.lemmaKey })
      }
      await localReviewPersistence.saveMastery(userId, mastery)

      track(ANALYTICS_EVENTS.review_card_completed, {
        reviewItemId: card.reviewItemId,
        score,
      })

      if (score <= 2) {
        await recordMistakeEvent(localReviewPersistence, {
          userId,
          lessonId: 'review-session',
          stepId: card.instanceId,
          itemId: card.reviewItemId,
          userAnswer: payload.userAnswer,
          correctAnswer:
            typeof card.correctAnswer === 'string' ? card.correctAnswer : card.correctAnswer.join(' / '),
          severity: score === 1 ? 3 : 2,
          reviewItemId: card.reviewItemId,
          classify: {
            userAnswer: payload.userAnswer,
            correctAnswer:
              typeof card.correctAnswer === 'string' ? card.correctAnswer : card.correctAnswer[0],
            retries: payload.hintUsed ? 2 : 0,
          },
        })
      }

      refreshProgressAfterDomainWrite(userId)

      await new Promise((r) => setTimeout(r, 720))
      setFeedback(null)

      const isLast = index >= cards.length - 1
      if (isLast) {
        const nc = statsRef.current.correct
        const nw = statsRef.current.wrong
        track(ANALYTICS_EVENTS.review_session_completed, {
          mode: opts.mode,
          correct: nc,
          wrong: nw,
          total: cards.length,
        })
        const retentionMode = opts.mode === 'mistake_fix' ? 'mistake_fix' : 'daily'
        const meta = recordReviewSessionComplete({
          userId,
          mode: retentionMode,
          correct: nc,
          wrong: nw,
          total: cards.length,
        })
        setSessionMeta(meta)
        await localReviewPersistence.saveMastery(userId, mastery)
        setDone(true)
      } else {
        setIndex((i) => i + 1)
      }
    },
    [cards, index, userId, opts.mode]
  )

  return {
    loading,
    seeding,
    cards,
    index,
    current: cards[index],
    feedback,
    done,
    correctCount,
    wrongCount,
    total: cards.length,
    sessionMeta,
    reload,
    loadDemo,
    telemetry,
    submitCard,
  }
}
