/**
 * CLI: inspect due-queue construction, adaptive mix, and card building (no browser).
 *
 * Usage: npm run review:simulate
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { ReviewItem } from '../src/lib/schemas/reviewItem.schema'
import type { SrsItem } from '../src/lib/schemas/srsItem.schema'
import type { MistakeEvent } from '../src/lib/schemas/mistakeEvent.schema'
import type { UserMastery } from '../src/lib/schemas/userMastery.schema'
import type { ReviewPersistencePort } from '../src/lib/review-engine/reviewPersistence'
import { planReviewSession } from '../src/lib/review-engine/reviewSessionPlanner'

const root = process.cwd()

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T
}

class MemoryPersistence implements ReviewPersistencePort {
  constructor(
    private readonly scopedUserId: string,
    public bank: ReviewItem[],
    public srs: SrsItem[],
    public mistakes: MistakeEvent[],
    public mastery: UserMastery | null
  ) {}

  async loadReviewBank(userId: string) {
    return userId === this.scopedUserId ? this.bank : []
  }
  async saveReviewBank(userId: string, items: ReviewItem[]) {
    if (userId === this.scopedUserId) this.bank = items
  }
  async loadSrsItems(userId: string) {
    return userId === this.scopedUserId ? this.srs : []
  }
  async saveSrsItems(userId: string, items: SrsItem[]) {
    if (userId === this.scopedUserId) this.srs = items
  }
  async loadMistakeEvents(userId: string) {
    return userId === this.scopedUserId ? this.mistakes : []
  }
  async saveMistakeEvents(userId: string, events: MistakeEvent[]) {
    if (userId === this.scopedUserId) this.mistakes = events
  }
  async appendMistakeEvent(userId: string, ev: MistakeEvent) {
    if (userId === this.scopedUserId) this.mistakes = [...this.mistakes, ev].slice(-800)
  }
  async loadMastery(userId: string) {
    return userId === this.scopedUserId ? this.mastery : null
  }
  async saveMastery(userId: string, m: UserMastery) {
    if (userId === this.scopedUserId) this.mastery = m
  }
}

async function main() {
  const bankPath = path.join(root, 'content/samples/sample-review-deck.json')
  const statePath = path.join(root, 'content/samples/sample-user-review-state.json')
  const bank = readJson<ReviewItem[]>(bankPath)
  const state = readJson<{
    userId: string
    srsItems: SrsItem[]
    mistakeEvents: MistakeEvent[]
    mastery: UserMastery
  }>(statePath)

  const port = new MemoryPersistence(state.userId, bank, state.srsItems, state.mistakeEvents, state.mastery)

  for (const mode of ['daily', 'module', 'mistake_fix'] as const) {
    const { cards, rowCount } = await planReviewSession(port, {
      userId: state.userId,
      mode,
      moduleId: mode === 'module' ? 'a2-m02' : undefined,
      targetSize: 8,
      seed: 7,
      now: new Date('2025-03-25T12:00:00.000Z'),
    })
    console.log('\n=== mode:', mode, 'rows:', rowCount, 'cards:', cards.length, '===')
    for (const c of cards) {
      console.log('-', c.uiMode, '|', c.itemType, '|', c.prompt.slice(0, 56) + (c.prompt.length > 56 ? '…' : ''))
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
