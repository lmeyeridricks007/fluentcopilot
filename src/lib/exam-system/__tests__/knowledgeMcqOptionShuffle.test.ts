import { describe, expect, it } from 'vitest'
import { generateExamTasks } from '../taskGenerator'
import { getExamProfile } from '../examProfileRegistry'
import { getA2KnmMcqByPoolIndex, getA2KnmMcqPoolLength } from '../knmMcqBank'
import {
  knowledgeMcqOptionDisplayLetter,
  knowledgeMcqOptionsShuffledForTask,
} from '../knowledgeMcqOptionShuffle'

describe('knowledgeMcqOptionDisplayLetter', () => {
  it('maps row index to A–D', () => {
    expect(knowledgeMcqOptionDisplayLetter(0)).toBe('A')
    expect(knowledgeMcqOptionDisplayLetter(3)).toBe('D')
  })
})

describe('knowledgeMcqOptionsShuffledForTask', () => {
  it('changes option order while preserving ids and labels', () => {
    const options = [
      { id: 'a', label: 'Wrong 1' },
      { id: 'b', label: 'Correct' },
      { id: 'c', label: 'Wrong 2' },
      { id: 'd', label: 'Wrong 3' },
    ]
    const shuffled = knowledgeMcqOptionsShuffledForTask(options, 'seed-1', 'task-0')
    expect(shuffled.map((o) => o.id).sort().join('')).toBe('abcd')
    expect(shuffled.find((o) => o.id === 'b')?.label).toBe('Correct')
    expect(shuffled.map((o) => o.id)).not.toEqual(options.map((o) => o.id))
  })

  it('is deterministic for the same session seed and task key', () => {
    const options = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
      { id: 'd', label: 'D' },
    ]
    const a = knowledgeMcqOptionsShuffledForTask(options, 's1', 'task-3')
    const b = knowledgeMcqOptionsShuffledForTask(options, 's1', 'task-3')
    expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id))
  })
})

describe('KNM exam task generation', () => {
  it('does not leave the correct option in the first slot for every question', () => {
    const profile = getExamProfile('inburgering_knm_A2')!
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'full',
      sessionSeed: 'shuffle-audit-seed',
    })
    let firstSlotCorrect = 0
    for (const t of tasks) {
      const opts = t.mcq?.options ?? []
      const correct = new Set(t.mcq?.correctOptionIds ?? [])
      if (opts[0] && correct.has(opts[0].id)) firstSlotCorrect += 1
    }
    expect(tasks.length).toBe(40)
    expect(firstSlotCorrect).toBeLessThan(tasks.length)
  })

  it('bank has many items with correct id a but shuffled tasks spread positions', () => {
    let bankCorrectA = 0
    const n = getA2KnmMcqPoolLength()
    for (let i = 0; i < Math.min(n, 200); i++) {
      const item = getA2KnmMcqByPoolIndex(i)
      if (item.correctOptionIds.length === 1 && item.correctOptionIds[0] === 'a') bankCorrectA += 1
    }
    expect(bankCorrectA).toBeGreaterThan(50)

    const profile = getExamProfile('inburgering_knm_A2')!
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'full',
      sessionSeed: 'spread-seed-99',
    })
    const positions: number[] = []
    for (const t of tasks) {
      const opts = t.mcq?.options ?? []
      const cid = t.mcq?.correctOptionIds[0]
      const ix = opts.findIndex((o) => o.id === cid)
      if (ix >= 0) positions.push(ix)
    }
    expect(new Set(positions).size).toBeGreaterThan(1)
  })
})
