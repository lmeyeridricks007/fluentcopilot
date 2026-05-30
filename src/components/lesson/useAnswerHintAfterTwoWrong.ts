'use client'

import { useCallback, useState } from 'react'

/**
 * After two incorrect attempts, learner can open a hint with the model answer.
 */
export function useAnswerHintAfterTwoWrong() {
  const [wrongCount, setWrongCount] = useState(0)
  const [hintVisible, setHintVisible] = useState(false)

  const registerWrong = useCallback(() => {
    setWrongCount((n) => n + 1)
  }, [])

  const registerCorrect = useCallback(() => {
    setWrongCount(0)
    setHintVisible(false)
  }, [])

  const openHint = useCallback(() => setHintVisible(true), [])

  const showHintOffer = wrongCount >= 2 && !hintVisible

  return {
    wrongCount,
    hintVisible,
    showHintOffer,
    registerWrong,
    registerCorrect,
    openHint,
  }
}
