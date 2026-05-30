import sql from 'mssql'
import type {
  ConversationMode,
  ConversationSurface,
  ConversationThread,
  FeedbackMode,
  SpeakLivePostSessionPhase,
  ThreadStatus,
} from '../models/contracts'
import { newId } from '../shared/ids'

const SL_POST_PHASES: readonly SpeakLivePostSessionPhase[] = ['active', 'ending', 'evaluating', 'verifying', 'evaluated', 'failed']

function mapSpeakLivePostSessionPhase(raw: string | null | undefined): SpeakLivePostSessionPhase | null {
  if (!raw) return null
  const u = raw.trim().toLowerCase()
  return (SL_POST_PHASES as readonly string[]).includes(u) ? (u as SpeakLivePostSessionPhase) : null
}

function mapThread(r: {
  Id: string
  UserId: string
  ScenarioId: string
  PersonaId: string
  Mode: string
  ConversationSurface?: string | null
  FeedbackMode: string
  Status: string
  SummaryText: string | null
  CurrentStage: string | null
  SpeakLiveStateJson?: string | null
  SpeakLivePostSessionPhase?: string | null
  CreatedAt: Date
  UpdatedAt: Date
  LastUserMessageAt: Date | null
}): ConversationThread {
  const surfaceRaw = (r.ConversationSurface ?? 'text').toLowerCase()
  const conversationSurface: ConversationSurface = surfaceRaw === 'speak_live' ? 'speak_live' : 'text'
  return {
    id: r.Id,
    userId: r.UserId,
    scenarioId: r.ScenarioId,
    personaId: r.PersonaId,
    mode: r.Mode as ConversationMode,
    conversationSurface,
    feedbackMode: r.FeedbackMode as FeedbackMode,
    status: r.Status as ThreadStatus,
    summaryText: r.SummaryText,
    currentStage: r.CurrentStage,
    speakLiveStateJson: r.SpeakLiveStateJson ?? null,
    speakLivePostSessionPhase: mapSpeakLivePostSessionPhase(r.SpeakLivePostSessionPhase),
    createdAt: r.CreatedAt.toISOString(),
    updatedAt: r.UpdatedAt.toISOString(),
    lastUserMessageAt: r.LastUserMessageAt ? r.LastUserMessageAt.toISOString() : null,
  }
}

export async function insertThread(
  pool: sql.ConnectionPool,
  input: {
    userId: string
    scenarioId: string
    personaId: string
    mode: ConversationMode
    feedbackMode: FeedbackMode
    conversationSurface?: ConversationSurface
    summaryText?: string | null
    currentStage?: string | null
    speakLiveStateJson?: string | null
    speakLivePostSessionPhase?: SpeakLivePostSessionPhase | null
  }
): Promise<ConversationThread> {
  const id = newId()
  const conversationSurface = input.conversationSurface ?? 'text'
  const speakLivePostSessionPhase =
    input.speakLivePostSessionPhase ?? (conversationSurface === 'speak_live' ? 'active' : null)
  await pool
    .request()
    .input('id', id)
    .input('userId', input.userId)
    .input('scenarioId', input.scenarioId)
    .input('personaId', input.personaId)
    .input('mode', input.mode)
    .input('feedbackMode', input.feedbackMode)
    .input('conversationSurface', conversationSurface)
    .input('status', 'active')
    .input('summaryText', input.summaryText ?? null)
    .input('currentStage', input.currentStage ?? 'opening')
    .input('speakLiveStateJson', input.speakLiveStateJson ?? null)
    .input('speakLivePostSessionPhase', speakLivePostSessionPhase)
    .query(`
      INSERT INTO dbo.ConversationThreads
        (Id, UserId, ScenarioId, PersonaId, Mode, FeedbackMode, ConversationSurface, Status, SummaryText, CurrentStage, SpeakLiveStateJson, SpeakLivePostSessionPhase)
      VALUES (@id, @userId, @scenarioId, @personaId, @mode, @feedbackMode, @conversationSurface, @status, @summaryText, @currentStage, @speakLiveStateJson, @speakLivePostSessionPhase)
    `)
  const created = await getThreadById(pool, id)
  if (!created) throw new Error('Failed to read thread after insert')
  return created
}

export async function getThreadById(pool: sql.ConnectionPool, threadId: string): Promise<ConversationThread | null> {
  const r = await pool.request().input('id', threadId).query(`
    SELECT Id, UserId, ScenarioId, PersonaId, Mode, ConversationSurface, FeedbackMode, Status, SummaryText, CurrentStage,
           SpeakLiveStateJson, SpeakLivePostSessionPhase, CreatedAt, UpdatedAt, LastUserMessageAt
    FROM dbo.ConversationThreads WHERE Id = @id
  `)
  const row = r.recordset[0]
  return row ? mapThread(row) : null
}

export async function getActiveThreadForUserScenario(
  pool: sql.ConnectionPool,
  userId: string,
  scenarioId: string
): Promise<ConversationThread | null> {
  const r = await pool.request().input('userId', userId).input('scenarioId', scenarioId).query(`
    SELECT TOP 1 Id, UserId, ScenarioId, PersonaId, Mode, ConversationSurface, FeedbackMode, Status, SummaryText, CurrentStage,
           SpeakLiveStateJson, SpeakLivePostSessionPhase, CreatedAt, UpdatedAt, LastUserMessageAt
    FROM dbo.ConversationThreads
    WHERE UserId = @userId AND ScenarioId = @scenarioId AND Status = N'active'
    ORDER BY UpdatedAt DESC
  `)
  const row = r.recordset[0]
  return row ? mapThread(row) : null
}

export async function getLatestActiveThreadForUser(
  pool: sql.ConnectionPool,
  userId: string
): Promise<ConversationThread | null> {
  const r = await pool.request().input('userId', userId).query(`
    SELECT TOP 1 Id, UserId, ScenarioId, PersonaId, Mode, ConversationSurface, FeedbackMode, Status, SummaryText, CurrentStage,
           SpeakLiveStateJson, SpeakLivePostSessionPhase, CreatedAt, UpdatedAt, LastUserMessageAt
    FROM dbo.ConversationThreads
    WHERE UserId = @userId AND Status = N'active'
    ORDER BY UpdatedAt DESC
  `)
  const row = r.recordset[0]
  return row ? mapThread(row) : null
}

export async function updateThreadState(
  pool: sql.ConnectionPool,
  threadId: string,
  patch: {
    summaryText?: string | null
    currentStage?: string | null
    speakLiveStateJson?: string | null
    status?: ThreadStatus
    lastUserMessageAt?: Date
    speakLivePostSessionPhase?: SpeakLivePostSessionPhase | null
  }
): Promise<void> {
  const sets: string[] = ['UpdatedAt = SYSUTCDATETIME()']
  const req = pool.request().input('id', threadId)
  if (patch.summaryText !== undefined) {
    sets.push('SummaryText = @summaryText')
    req.input('summaryText', patch.summaryText)
  }
  if (patch.currentStage !== undefined) {
    sets.push('CurrentStage = @currentStage')
    req.input('currentStage', patch.currentStage)
  }
  if (patch.speakLiveStateJson !== undefined) {
    sets.push('SpeakLiveStateJson = @speakLiveStateJson')
    req.input('speakLiveStateJson', patch.speakLiveStateJson)
  }
  if (patch.status !== undefined) {
    sets.push('Status = @status')
    req.input('status', patch.status)
  }
  if (patch.lastUserMessageAt !== undefined) {
    sets.push('LastUserMessageAt = @lastUserMessageAt')
    req.input('lastUserMessageAt', patch.lastUserMessageAt)
  }
  if (patch.speakLivePostSessionPhase !== undefined) {
    sets.push('SpeakLivePostSessionPhase = @speakLivePostSessionPhase')
    req.input('speakLivePostSessionPhase', patch.speakLivePostSessionPhase)
  }
  await req.query(`UPDATE dbo.ConversationThreads SET ${sets.join(', ')} WHERE Id = @id`)
}

export async function pauseOtherActiveThreads(
  pool: sql.ConnectionPool,
  userId: string,
  scenarioId: string,
  exceptThreadId: string
): Promise<void> {
  await pool
    .request()
    .input('userId', userId)
    .input('scenarioId', scenarioId)
    .input('exceptId', exceptThreadId)
    .query(`
      UPDATE dbo.ConversationThreads SET Status = N'paused', UpdatedAt = SYSUTCDATETIME()
      WHERE UserId = @userId AND ScenarioId = @scenarioId AND Status = N'active' AND Id <> @exceptId
    `)
}

export async function listThreadsByUserScenarioAndStatus(
  pool: sql.ConnectionPool,
  userId: string,
  scenarioId: string,
  status: ThreadStatus,
  limit: number
): Promise<ConversationThread[]> {
  const r = await pool
    .request()
    .input('userId', userId)
    .input('scenarioId', scenarioId)
    .input('status', status)
    .input('limit', sql.Int, Math.min(Math.max(limit, 1), 20))
    .query(`
    SELECT TOP (@limit) Id, UserId, ScenarioId, PersonaId, Mode, ConversationSurface, FeedbackMode, Status, SummaryText, CurrentStage,
           SpeakLiveStateJson, SpeakLivePostSessionPhase, CreatedAt, UpdatedAt, LastUserMessageAt
    FROM dbo.ConversationThreads
    WHERE UserId = @userId AND ScenarioId = @scenarioId AND Status = @status
    ORDER BY UpdatedAt DESC
  `)
  return r.recordset.map(mapThread)
}

/** Recent completed threads across all scenarios (Speak Live + text coach), for History / Activity. */
export async function listRecentCompletedThreadsForUser(
  pool: sql.ConnectionPool,
  userId: string,
  limit: number
): Promise<ConversationThread[]> {
  const r = await pool
    .request()
    .input('userId', userId)
    .input('limit', sql.Int, Math.min(Math.max(limit, 1), 100))
    .query(`
    SELECT TOP (@limit) Id, UserId, ScenarioId, PersonaId, Mode, ConversationSurface, FeedbackMode, Status, SummaryText, CurrentStage,
           SpeakLiveStateJson, SpeakLivePostSessionPhase, CreatedAt, UpdatedAt, LastUserMessageAt
    FROM dbo.ConversationThreads
    WHERE UserId = @userId AND Status = N'completed'
    ORDER BY UpdatedAt DESC
  `)
  return r.recordset.map(mapThread)
}
