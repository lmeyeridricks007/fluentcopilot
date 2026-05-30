import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type { SpeakingAssessmentResult } from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import { getSpeakingAssessmentStorePath, isSpeakingAssessmentPersistenceEnabled } from './speakingAssessmentConfig'
import type { SpeakingCoachingDebugBundle } from './speakingCoachingFromAssessmentService'

export type StoredSpeakingAssessment = {
  id: string
  userId: string
  createdAtUtc: string
  caveats: string[]
  canonical: SpeakingAssessmentResult
  /** Present when SPEAKING_SAVE_RAW_PROVIDER_PAYLOAD=1 */
  rawProviderPayload?: unknown
  generatedCoachingPayload?: unknown
  /** Present when SPEAKING_COACHING_DEBUG=1 — LLM input + raw attempts (dev only). */
  coachingDebug?: SpeakingCoachingDebugBundle
}

export interface ISpeakingAssessmentRepository {
  save(row: StoredSpeakingAssessment): Promise<void>
  get(id: string): Promise<StoredSpeakingAssessment | null>
}

export class FileSpeakingAssessmentRepository implements ISpeakingAssessmentRepository {
  constructor(private readonly baseDir: string) {}

  private pathFor(id: string): string {
    const safe = id.replace(/[^a-zA-Z0-9_-]/g, '')
    return path.join(this.baseDir, `${safe}.json`)
  }

  async save(row: StoredSpeakingAssessment): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true })
    await fs.writeFile(this.pathFor(row.id), JSON.stringify(row, null, 2), 'utf8')
  }

  async get(id: string): Promise<StoredSpeakingAssessment | null> {
    try {
      const raw = await fs.readFile(this.pathFor(id), 'utf8')
      return JSON.parse(raw) as StoredSpeakingAssessment
    } catch {
      return null
    }
  }
}

export class NullSpeakingAssessmentRepository implements ISpeakingAssessmentRepository {
  async save(): Promise<void> {}
  async get(): Promise<null> {
    return null
  }
}

export function createSpeakingAssessmentRepository(): ISpeakingAssessmentRepository {
  const explicit = getSpeakingAssessmentStorePath()
  if (explicit) return new FileSpeakingAssessmentRepository(explicit)
  if (isSpeakingAssessmentPersistenceEnabled()) {
    return new FileSpeakingAssessmentRepository(path.join(process.cwd(), 'data', 'speaking-assessments'))
  }
  return new NullSpeakingAssessmentRepository()
}
