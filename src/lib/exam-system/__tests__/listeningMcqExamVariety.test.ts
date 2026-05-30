import { describe, expect, it } from 'vitest'
import { buildA2StandaloneListeningExamSequence } from '../a2StandaloneListeningExamPack'
import { listeningMcqItemWithShuffledOptions } from '../listeningMcqOptionShuffle'

describe('listeningMcqItemWithShuffledOptions', () => {
  it('keeps the correct label aligned with correctOptionIds after shuffling', () => {
    const item = {
      dialogueNl: 'A: Test. B: Om tien uur.',
      questionNl: 'Hoe laat?',
      questionEn: 'What time?',
      options: [
        { id: 'a', label: 'Om tien uur.' },
        { id: 'b', label: 'Om zeven uur.' },
        { id: 'c', label: 'Nooit.' },
        { id: 'd', label: 'Dat weet niemand.' },
      ],
      correctOptionIds: ['a'],
    }
    const shuffled = listeningMcqItemWithShuffledOptions(item, 'session-seed-x', 'task-0')
    expect(shuffled.correctOptionIds.length).toBe(1)
    expect(shuffled.options.map((o) => o.id).sort().join('')).toBe('abcd')
    const correctId = shuffled.correctOptionIds[0]!
    const correctLabel = shuffled.options.find((o) => o.id === correctId)?.label
    expect(correctLabel).toBe('Om tien uur.')
  })

  it('does not leave the correct key on a for every session seed (randomized slot)', () => {
    const item = {
      dialogueNl: 'A: Test. B: Hallo.',
      questionNl: 'Hoe laat?',
      questionEn: 'What time?',
      options: [
        { id: 'a', label: 'Om tien uur.' },
        { id: 'b', label: 'Om zeven uur.' },
        { id: 'c', label: 'Nooit.' },
        { id: 'd', label: 'Dat weet niemand.' },
      ],
      correctOptionIds: ['a'],
    }
    let sawNonA = false
    for (let k = 0; k < 80; k += 1) {
      const sh = listeningMcqItemWithShuffledOptions(item, `vary-seed-${k}`, 'task-0')
      if (sh.correctOptionIds[0] !== 'a') sawNonA = true
    }
    expect(sawNonA).toBe(true)
  })

  it('is deterministic for the same seed and salt', () => {
    const item = {
      dialogueNl: 'A: Hallo. B: Dag.',
      questionNl: 'Vraag?',
      questionEn: 'Q?',
      options: [
        { id: 'a', label: 'Een' },
        { id: 'b', label: 'Twee' },
        { id: 'c', label: 'Drie' },
        { id: 'd', label: 'Vier' },
      ],
      correctOptionIds: ['b'],
    }
    const a = listeningMcqItemWithShuffledOptions(item, 's1', 'salt')
    const b = listeningMcqItemWithShuffledOptions(item, 's1', 'salt')
    expect(a.options.map((o) => o.id)).toEqual(b.options.map((o) => o.id))
    expect(a.correctOptionIds).toEqual(b.correctOptionIds)
  })
})

describe('buildA2StandaloneListeningExamSequence', () => {
  it('includes at most one item with the duplicate meeting-time stem', () => {
    const stem = 'Hoe laat begint de vergadering volgens B?'
    const seq = buildA2StandaloneListeningExamSequence('variety-test-seed-1')
    const meetingCount = seq.filter((s) => s.item.questionNl.trim() === stem).length
    expect(meetingCount).toBeLessThanOrEqual(1)
  })

  it('still returns 25 slots with unique bank indices', () => {
    const seq = buildA2StandaloneListeningExamSequence('variety-test-seed-2')
    expect(seq).toHaveLength(25)
    const ids = seq.map((s) => Number((s.scenarioId ?? '').replace(/^bank-/, '')))
    expect(new Set(ids).size).toBe(25)
  })
})
