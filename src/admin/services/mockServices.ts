/**
 * Admin — mock service implementations.
 */

import { MOCK_QUEUE_ITEMS, getMockArtifactDetail } from '../mocks/queue'
import { MOCK_BATCHES } from '../mocks/batches'
import { MOCK_AUDIT_EVENTS } from '../mocks/audit'
import { MOCK_PROMPTS } from '../mocks/prompts'
import { MOCK_SCENARIOS } from '../mocks/scenarios'
import type { ReviewQueueItem } from '../types/artifacts'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const reviewQueueService = {
  async listQueue(filters?: Record<string, unknown>): Promise<ReviewQueueItem[]> {
    await delay(200)
    let items = [...MOCK_QUEUE_ITEMS]
    if (filters?.artifact_type) {
      items = items.filter((i) => i.artifact_type === filters.artifact_type)
    }
    if (filters?.review_status) {
      items = items.filter((i) => i.review_status === filters.review_status)
    }
    if (filters?.scenario) {
      items = items.filter((i) => i.scenario === filters.scenario)
    }
    return items
  },
  async getArtifact(id: string) {
    await delay(150)
    return getMockArtifactDetail(id)
  },
  async submitDecision(_itemId: string, _payload: unknown) {
    await delay(300)
  },
}

export const batchService = {
  async listBatches() {
    await delay(150)
    return [...MOCK_BATCHES]
  },
  async getBatch(id: string) {
    await delay(100)
    return MOCK_BATCHES.find((b) => b.id === id) ?? null
  },
  async getBatchArtifacts(batchId: string) {
    await delay(150)
    return MOCK_QUEUE_ITEMS.filter((a) => a.batch_id === batchId)
  },
}

export const auditService = {
  async listEvents() {
    await delay(150)
    return [...MOCK_AUDIT_EVENTS]
  },
}

export const promptLibraryService = {
  async listTemplates() {
    await delay(100)
    return MOCK_PROMPTS.map((p) => ({ code: p.code, name: p.name, versions: p.versions.map((v) => v.version) }))
  },
  async getTemplate(code: string) {
    await delay(100)
    const p = MOCK_PROMPTS.find((x) => x.code === code)
    return p ? { code: p.code, name: p.name, versions: p.versions.map((v) => ({ version: v.version, enabled: v.enabled })) } : null
  },
}

export const scenarioService = {
  async listScenarios() {
    await delay(100)
    return MOCK_SCENARIOS.map((s) => ({ id: s.id, name: s.name, category: s.category, artifact_count: s.artifact_count }))
  },
  async getScenario(id: string) {
    await delay(100)
    const s = MOCK_SCENARIOS.find((x) => x.id === id)
    return s ? { id: s.id, name: s.name, metadata: { category: s.category, cefr_range: s.cefr_range } } : null
  },
}

export const dashboardService = {
  async getStats() {
    await delay(180)
    const pending = MOCK_QUEUE_ITEMS.filter((i) => i.review_status === 'pending_review' || i.review_status === 'in_review').length
    return {
      pending_review: pending,
      approved_today: 2,
      validation_failures: 1,
      published_today: 1,
      needing_regeneration: 1,
    }
  },
}
