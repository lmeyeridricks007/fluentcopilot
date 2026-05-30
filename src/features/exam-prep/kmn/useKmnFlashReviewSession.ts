'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { ensureMasteryRow, localReviewPersistence } from '@/lib/review-engine/reviewPersistence'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { scoreReview, applyHintPenalty } from '@/lib/review-engine/scheduler'
import { updateMasteryFromReviewResult } from '@/lib/review-engine/mastery'
import { buildKmnFlashPracticeSession } from '@/lib/exam-prep/kmn/kmnFlashcardService'
import { recordKmnFlashcardsGraded } from '@/lib/exam-prep/kmn/kmnProgressService'
import type { KmnTopicId } from '@/lib/exam-prep/kmn/types'
import type { ReviewSessionCard } from '@/lib/review-engine/types'
import type { ReviewCardPayload } from '@/components/review/ReviewCard'
import { recordMistakeEvent } from '@/lib/mistakes/mistakeTagger'
import { applyExamLearningLoopClient } from '@/lib/exam-learning-loop/examMistakeExtractor'
import { recordReviewSessionComplete } from '@/lib/retention/retentionService'

import type { SrsItem } from '@/lib/schemas/srsItem.schema'

function upsertSrs(rows: SrsItem[], row: SrsItem): SrsItem[] {
  const i = rows.findIndex((r) => r.id === row.id)
  if (i === -1) return [...rows, row]
  const n = [...rows]
  n[i] = row
  return n
}

export function useKmnFlashReviewSession(topicId: KmnTopicId) {
  const userId = getRetentionUserId()
  const [loading, setLoading] = useState(true)
  const [cards, setCards] = useState<ReviewSessionCard[]>([])
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<{ correct: boolean } | null>(null)
  const [done, setDone] = useState(false)
  const started = useRef(false)
  const statsRef = useRef({ correct: 0, wrong: 0 })

  const reload = useCallback(async () => {
    setLoading(true)
    started.current = false
    statsRef.current = { correct: 0, wrong: 0 }
    try {
      const next = await buildKmnFlashPracticeSession(userId, localReviewPersistence, topicId, {
        limit: 8,
        seed: Date.now(),
        includeNotDue: true,
      })
      setCards(next)
      setIndex(0)
      setDone(next.length === 0)
      setFeedback(null)
    } finally {
      setLoading(false)
    }
  }, [userId, topicId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (loading || cards.length === 0 || started.current) return
    started.current = true
    track(ANALYTICS_EVENTS.kmn_flashcard_session_started, { kmn_topic: topicId, card_count: cards.length })
  }, [loading, cards.length, topicId])

  const telemetry = useCallback(
    (event: 'card_started' | 'hint_used') => {
      const card = cards[index]
      if (!card || event !== 'card_started') return
      track(ANALYTICS_EVENTS.kmn_flashcard_reviewed, {
        kmn_topic: topicId,
        review_item_id: card.reviewItemId,
        phase: 'shown',
      })
    },
    [cards, index, topicId]
  )

  const submitCard = useCallback(
    async (payload: ReviewCardPayload) => {
      const card = cards[index]
      if (!card) return

      let score = payload.score
      if (payload.hintUsed) score = applyHintPenalty(score)
      const correct = score >= 3
      if (correct) statsRef.current.correct += 1
      else statsRef.current.wrong += 1
      setFeedback({ correct })

      track(ANALYTICS_EVENTS.kmn_flashcard_reviewed, {
        kmn_topic: topicId,
        review_item_id: card.reviewItemId,
        phase: 'graded',
        score,
        correct,
      })

      if (!correct) {
        track(ANALYTICS_EVENTS.kmn_mistake_made, {
          kmn_topic: topicId,
          surface: 'flashcard',
          review_item_id: card.reviewItemId,
        })
        applyExamLearningLoopClient({
          kind: 'kmn',
          topicId,
          surface: 'flashcard',
          conceptOrStepId: card.reviewItemId,
          correct: false,
          attemptId: `kmn-flash-${topicId}-${card.reviewItemId}-${Date.now()}`,
        })
        await recordMistakeEvent(localReviewPersistence, {
          userId,
          lessonId: `kmn-${topicId}`,
          stepId: card.instanceId,
          itemId: card.reviewItemId,
          userAnswer: payload.userAnswer,
          correctAnswer: typeof card.correctAnswer === 'string' ? card.correctAnswer : card.correctAnswer[0],
          severity: 2,
          reviewItemId: card.reviewItemId,
          errorTypeOverride: 'vocab',
          classify: {
            contextTags: ['kmn', topicId],
            userAnswer: payload.userAnswer,
            correctAnswer: typeof card.correctAnswer === 'string' ? card.correctAnswer : card.correctAnswer[0],
          },
        })
      }

      const srsList = await localReviewPersistence.loadSrsItems(userId)
      const srs = srsList.find((s) => s.id === card.srsItemId)
      if (srs) {
        const nextSrs = scoreReview(srs, score)
        await localReviewPersistence.saveSrsItems(userId, upsertSrs(srsList, nextSrs))
      }

      const masteryRow = await ensureMasteryRow(localReviewPersistence, userId)
      const mastery = updateMasteryFromReviewResult(masteryRow, {
        itemType: card.itemType,
        lemmaKey: card.lemmaKey,
        grammarKey: card.grammarKey,
        effectiveScore: score,
      })
      await localReviewPersistence.saveMastery(userId, mastery)

      recordKmnFlashcardsGraded(topicId, 1)
      track(ANALYTICS_EVENTS.kmn_mastery_updated, { kmn_topic: topicId, surface: 'flashcard', correct })

      await new Promise((r) => setTimeout(r, 650))
      setFeedback(null)

      const isLast = index >= cards.length - 1
      if (isLast) {
        const { correct: nc, wrong: nw } = statsRef.current
        recordReviewSessionComplete({
          userId,
          mode: 'daily',
          correct: nc,
          wrong: nw,
          total: cards.length,
        })
        setDone(true)
      } else {
        setIndex((i) => i + 1)
      }
    },
    [cards, index, userId, topicId]
  )

  return {
    loading,
    cards,
    index,
    current: cards[index],
    feedback,
    done,
    total: cards.length,
    reload,
    telemetry,
    submitCard,
  }
}
