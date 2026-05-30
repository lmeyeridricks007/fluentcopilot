/**
 * Daily capture bundling: deterministic clustering + prioritization for {@link DailyCaptureBundle}.
 * Operates on {@link QuickCaptureRow} (UserQuickCaptures) — IDs align with day-pack / client.
 */
import type { DailyCaptureCluster } from '../../domain/quickCapture/captureDomainTypes'
import type { QuickCaptureRow, QuickCaptureStatus } from '../../repositories/quickCaptureRepository'
import { newId } from '../../shared/ids'

const STOP = new Set([
  'de',
  'het',
  'een',
  'van',
  'ik',
  'je',
  'u',
  'we',
  'te',
  'en',
  'op',
  'aan',
  'naar',
  'voor',
  'met',
  'bij',
  'dat',
  'die',
  'dit',
  'is',
  'niet',
  'als',
  'maar',
  'wat',
  'hier',
  'daar',
])

export type QuickCaptureFeatures = {
  id: string
  scenarioSlug: string | null
  placeKey: string | null
  tokens: Set<string>
  isStruggle: boolean
  captureType: string
  createdAtMs: number
  status: QuickCaptureStatus
  combinedLower: string
}

function tokenize(text: string): Set<string> {
  const out = new Set<string>()
  const t = text.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
  for (const raw of t.split(/\s+/)) {
    const w = raw.replace(/^[''-]+|[''-]+$/g, '').trim()
    if (w.length < 3 || STOP.has(w)) continue
    out.add(w)
  }
  return out
}

function parseScenarioFromEnriched(enrichedJson: string | null): string | null {
  if (!enrichedJson?.trim()) return null
  try {
    const j = JSON.parse(enrichedJson) as Record<string, unknown>
    const s = j.scenarioSlugGuess
    return typeof s === 'string' && s.trim() ? s.trim().toLowerCase() : null
  } catch {
    return null
  }
}

function heuristicScenarioFromText(combined: string): string | null {
  const s = combined.toLowerCase()
  if (/station|perron|spoor|trein|ns\b|ov|overstap/.test(s)) return 'train-station'
  if (/menu|ober|eten bestellen|café|restaurant|koffie/.test(s)) return 'ordering-food'
  if (/albert|jumbo|lidl|winkel|boodschap|supermarkt/.test(s)) return 'supermarket-shop'
  if (/arts|huisarts|apotheek/.test(s)) return 'doctor-pharmacy'
  if (/gemeente|paspoort|inschrijf/.test(s)) return 'gemeente-style'
  return null
}

export function extractFeatures(row: QuickCaptureRow): QuickCaptureFeatures {
  const primary = (row.bodyPrimary ?? '').trim()
  const secondary = (row.bodySecondary ?? '').trim()
  const title = (row.title ?? '').trim()
  const transcript = (row.transcript ?? '').trim()
  let ocr = ''
  if (row.enrichedJson) {
    try {
      const j = JSON.parse(row.enrichedJson) as { ocrText?: string }
      if (typeof j.ocrText === 'string') ocr = j.ocrText
    } catch {
      /* ignore */
    }
  }
  const combined = [primary, secondary, title, transcript, ocr].filter(Boolean).join('\n')
  const slug = parseScenarioFromEnriched(row.enrichedJson) ?? heuristicScenarioFromText(combined)
  const placeKey = (row.placeKind ?? '').trim().toLowerCase() || null
  const tokens = tokenize(combined)
  const createdAtMs = Date.parse(row.createdAt) || 0
  return {
    id: row.id,
    scenarioSlug: slug,
    placeKey,
    tokens,
    isStruggle: row.captureType === 'log_struggle',
    captureType: row.captureType,
    createdAtMs,
    status: row.status,
    combinedLower: combined.toLowerCase(),
  }
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 0
  let inter = 0
  for (const x of a) {
    if (b.has(x)) inter += 1
  }
  const union = a.size + b.size - inter
  return union ? inter / union : 0
}

/** Similarity in [0, ~6] — higher means same thematic bucket. */
export function similarityScore(a: QuickCaptureFeatures, b: QuickCaptureFeatures): number {
  let s = 0
  if (a.scenarioSlug && b.scenarioSlug && a.scenarioSlug === b.scenarioSlug) s += 2.4
  if (a.placeKey && b.placeKey && a.placeKey === b.placeKey) s += 2.2
  const jac = jaccard(a.tokens, b.tokens)
  if (jac >= 0.35) s += 1.6 * jac
  else if (jac >= 0.12) s += 0.8 * jac
  if (a.isStruggle && (b.isStruggle || b.captureType === 'voice_note' || b.captureType === 'save_phrase')) s += 0.9
  if (b.isStruggle && (a.captureType === 'voice_note' || a.captureType === 'save_phrase')) s += 0.45
  if (a.captureType === b.captureType && (a.captureType === 'save_word' || a.captureType === 'save_phrase') && jac > 0) {
    s += 0.35
  }
  return s
}

const MERGE_THRESHOLD = 2.05

class UnionFind {
  private readonly p: number[]
  constructor(n: number) {
    this.p = Array.from({ length: n }, (_, i) => i)
  }
  find(i: number): number {
    if (this.p[i] !== i) this.p[i] = this.find(this.p[i])
    return this.p[i]
  }
  union(a: number, b: number): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.p[rb] = ra
  }
}

function scenarioTitle(slug: string | null): string {
  if (!slug) return 'Mixed moments'
  const map: Record<string, string> = {
    'train-station': 'Train & travel',
    'ordering-food': 'Café & ordering',
    'supermarket-shop': 'Shopping & errands',
    'doctor-pharmacy': 'Health & pharmacy',
    'gemeente-style': 'Gemeente & admin',
  }
  return map[slug] ?? slug.replace(/-/g, ' ')
}

function statusWeight(st: QuickCaptureStatus): number {
  switch (st) {
    case 'ready_for_practice':
      return 4
    case 'new':
      return 3.2
    case 'enriched':
      return 2.8
    case 'included_in_practice':
      return 3
    case 'saved_long_term':
      return 2.2
    case 'practiced':
      return 1.2
    default:
      return 1
  }
}

function capturePriority(f: QuickCaptureFeatures, nowMs: number, weaknessHits: number): number {
  const hours = Math.max(0, (nowMs - f.createdAtMs) / 3600000)
  const recency = Math.max(0, 18 - Math.min(18, hours)) * 0.12
  return statusWeight(f.status) + recency + (f.isStruggle ? 1.4 : 0) + weaknessHits * 2.1
}

function weaknessHitsForCapture(f: QuickCaptureFeatures, weaknessKeys: Set<string>): number {
  let n = 0
  for (const k of weaknessKeys) {
    if (k.length >= 3 && f.combinedLower.includes(k)) n += 1
  }
  return Math.min(4, n)
}

function clusterSummary(ids: string[], feats: QuickCaptureFeatures[]): string {
  const types = new Map<string, number>()
  let struggle = 0
  for (const f of feats) {
    types.set(f.captureType, (types.get(f.captureType) ?? 0) + 1)
    if (f.isStruggle) struggle += 1
  }
  const parts: string[] = [`${ids.length} capture${ids.length === 1 ? '' : 's'}`]
  if (struggle) parts.push(`${struggle} struggle note${struggle === 1 ? '' : 's'}`)
  const top = [...types.entries()].sort((a, b) => b[1] - a[1])[0]
  if (top) parts.push(top[0].replace(/_/g, ' '))
  return parts.join(' · ')
}

function dominantScenario(feats: QuickCaptureFeatures[]): string[] {
  const counts = new Map<string, number>()
  for (const f of feats) {
    if (!f.scenarioSlug) continue
    counts.set(f.scenarioSlug, (counts.get(f.scenarioSlug) ?? 0) + 1)
  }
  let best: string | null = null
  let bestC = 0
  for (const [k, v] of counts) {
    if (v > bestC) {
      best = k
      bestC = v
    }
  }
  return best ? [best] : []
}

/**
 * 1) Drop archived. 2) Union captures with similarity ≥ threshold. 3) Rank clusters by priority.
 */
export function buildThemeClusters(
  rows: QuickCaptureRow[],
  weaknessNormalizedKeys: readonly string[],
): DailyCaptureCluster[] {
  const active = rows.filter((r) => r.status !== 'archived')
  if (!active.length) return []

  const feats = active.map(extractFeatures)
  const weaknessSet = new Set(weaknessNormalizedKeys.map((k) => k.toLowerCase().trim()).filter(Boolean))
  const now = Date.now()
  const n = feats.length
  const uf = new UnionFind(n)
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (similarityScore(feats[i], feats[j]) >= MERGE_THRESHOLD) uf.union(i, j)
    }
  }
  const groups = new Map<number, number[]>()
  for (let i = 0; i < n; i += 1) {
    const r = uf.find(i)
    const arr = groups.get(r) ?? []
    arr.push(i)
    groups.set(r, arr)
  }

  const clusters: DailyCaptureCluster[] = []
  for (const idxs of groups.values()) {
    const members = idxs.map((i) => feats[i])
    const ids = members.map((m) => m.id)
    const scenTags = dominantScenario(members)
    const slug = scenTags[0] ?? null
    const title = scenarioTitle(slug)
    const summary = clusterSummary(ids, members)
    let priority = 0
    for (const f of members) {
      const wh = weaknessHitsForCapture(f, weaknessSet)
      priority += capturePriority(f, now, wh)
    }
    const themeRepeatBonus = members.length >= 2 && scenTags.length ? 1.6 : 0
    const realLifeBonus = members.some((m) => m.captureType === 'photo_text' || m.captureType === 'voice_note')
      ? 0.9
      : 0
    priority += themeRepeatBonus + realLifeBonus

    clusters.push({
      id: newId(),
      title,
      summary,
      scenarioTags: scenTags,
      relatedCaptureIds: ids,
      priorityScore: Math.round(priority * 100) / 100,
    })
  }

  clusters.sort((a, b) => b.priorityScore - a.priorityScore)
  return clusters
}

/** Flatten clusters in priority order for CaptureIdsJson (dedup preserves cluster order). */
export function orderedCaptureIdsFromClusters(clusters: DailyCaptureCluster[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const c of clusters) {
    for (const id of c.relatedCaptureIds) {
      if (seen.has(id)) continue
      seen.add(id)
      out.push(id)
    }
  }
  return out
}
