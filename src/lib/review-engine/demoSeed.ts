/**
 * Merge bundled sample bank + user state into the local persistence port (dev / QA).
 */
import { reviewItemSchema, type ReviewItem } from '@/lib/schemas/reviewItem.schema'
import { srsItemSchema, type SrsItem } from '@/lib/schemas/srsItem.schema'
import { mistakeEventSchema, type MistakeEvent } from '@/lib/schemas/mistakeEvent.schema'
import { userMasterySchema } from '@/lib/schemas/userMastery.schema'
import type { ReviewPersistencePort } from '@/lib/review-engine/reviewPersistence'
import sampleBank from '../../../content/samples/sample-review-deck.json'
import sampleState from '../../../content/samples/sample-user-review-state.json'

type SampleStateFile = {
  userId: string
  srsItems: unknown[]
  mistakeEvents: unknown[]
  mastery: unknown
}

function parseBank(raw: unknown[]): ReviewItem[] {
  const out: ReviewItem[] = []
  for (const row of raw) {
    const p = reviewItemSchema.safeParse(row)
    if (p.success) out.push(p.data)
  }
  return out
}

function parseSrs(raw: unknown[]): SrsItem[] {
  const out: SrsItem[] = []
  for (const row of raw) {
    const p = srsItemSchema.safeParse(row)
    if (p.success) out.push(p.data)
  }
  return out
}

function parseMistakes(raw: unknown[]): MistakeEvent[] {
  const out: MistakeEvent[] = []
  for (const row of raw) {
    const p = mistakeEventSchema.safeParse(row)
    if (p.success) out.push(p.data)
  }
  return out
}

/**
 * Upserts sample review items, replaces SRS/mistakes for user, merges mastery maps.
 */
export async function seedReviewDemoData(
  port: ReviewPersistencePort,
  userId: string = (sampleState as SampleStateFile).userId
): Promise<void> {
  const state = sampleState as SampleStateFile
  const bankRows = parseBank(sampleBank as unknown[])
  let bank = await port.loadReviewBank(userId)
  const byId = new Map(bank.map((b) => [b.id, b]))
  for (const r of bankRows) {
    byId.set(r.id, r)
  }
  bank = [...byId.values()]
  await port.saveReviewBank(userId, bank)

  const srs = parseSrs(state.srsItems)
  await port.saveSrsItems(userId, srs)

  const mistakes = parseMistakes(state.mistakeEvents)
  await port.saveMistakeEvents(userId, mistakes)

  const mParsed = userMasterySchema.safeParse(state.mastery)
  if (mParsed.success) {
    await port.saveMastery(userId, mParsed.data)
  }
}
