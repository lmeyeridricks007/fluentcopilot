import type { DailyActivity, SessionSummary, SuggestionState, UserProgress } from '../types/progress'

/** Cursor for keyset pagination of session summaries (opaque to callers). */
export type SessionSummaryListCursor = {
  /** ISO `createdAt` of the last row from the previous page. */
  createdAt: string
  sessionId: string
}

export type ListSessionSummariesParams = {
  userId: string
  /** Maximum rows to return (repository may clamp). */
  limit: number
  cursor?: SessionSummaryListCursor
}

export type ListDailyActivityParams = {
  userId: string
  /** Inclusive `YYYY-MM-DD`. */
  fromDate: string
  /** Inclusive `YYYY-MM-DD`. */
  toDate: string
}

/**
 * Persistence port for aggregate user progression (XP + streak fields).
 * Implement with Prisma, SQL, or document store — keep transactions at the adapter.
 */
export interface IUserProgressRepository {
  getByUserId(userId: string): Promise<UserProgress | null>
  upsert(progress: UserProgress): Promise<void>
}

/** Persistence port for per-day rollups used by streak logic and dashboards. */
export interface IDailyActivityRepository {
  getByUserIdAndDate(userId: string, date: string): Promise<DailyActivity | null>
  upsert(activity: DailyActivity): Promise<void>
  listInDateRange(params: ListDailyActivityParams): Promise<DailyActivity[]>
}

/** Persistence port for append-mostly session summaries / XP audit trail. */
export interface ISessionSummaryRepository {
  insert(summary: SessionSummary): Promise<void>
  getBySessionId(sessionId: string): Promise<SessionSummary | null>
  listByUser(params: ListSessionSummariesParams): Promise<SessionSummary[]>
}

/** Persistence port for suggestion engine continuity and de-duplication metadata. */
export interface ISuggestionStateRepository {
  getByUserId(userId: string): Promise<SuggestionState | null>
  upsert(state: SuggestionState): Promise<void>
}
