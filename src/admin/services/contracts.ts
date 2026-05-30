/**
 * Admin — service contracts (swap to real API later).
 */

import type { ReviewQueueItem, ArtifactDetail, ReviewDecisionPayload } from '../types/artifacts'
import type { BatchRun } from '../types/batches'
import type { AuditEvent } from '../types/audit'

export interface ReviewQueueService {
  listQueue(filters?: Record<string, unknown>): Promise<ReviewQueueItem[]>
  getArtifact(id: string): Promise<ArtifactDetail | null>
  submitDecision(itemId: string, payload: ReviewDecisionPayload): Promise<void>
}

export interface BatchService {
  listBatches(): Promise<BatchRun[]>
  getBatch(id: string): Promise<BatchRun | null>
  getBatchArtifacts(batchId: string): Promise<ReviewQueueItem[]>
}

export interface AuditService {
  listEvents(filters?: Record<string, unknown>): Promise<AuditEvent[]>
}

export interface PromptLibraryService {
  listTemplates(): Promise<{ code: string; name: string; versions: number[] }[]>
  getTemplate(code: string): Promise<{ code: string; name: string; versions: { version: number; enabled: boolean }[] } | null>
}

export interface ScenarioService {
  listScenarios(): Promise<{ id: string; name: string; category: string; artifact_count: number }[]>
  getScenario(id: string): Promise<{ id: string; name: string; metadata: Record<string, unknown> } | null>
}

export interface DashboardService {
  getStats(): Promise<{
    pending_review: number
    approved_today: number
    validation_failures: number
    published_today: number
    needing_regeneration: number
  }>
}
