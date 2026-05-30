import type sql from 'mssql'
import { newId } from '../shared/ids'
import type { ListeningSession, ListeningSessionStatus } from '../domain/listening/listeningSession'
import type { ListeningAttempt, ListeningAnswerMode } from '../domain/listening/listeningAttempt'
import type { ListeningDrillType } from '../domain/listening/listeningDrillType'
import type { ListeningClip } from '../domain/listening/listeningClip'
import type { ListeningWeaknessSignal } from '../domain/listening/listeningWeaknessSignal'

type SessionRow = {
  Id: string
  UserId: string
  TrackId: string | null
  ScenarioKey: string | null
  Category: string
  Level: string
  DrillIdsJson: string
  Status: ListeningSessionStatus
  ClientSessionKey: string | null
  CreatedAt: Date
  CompletedAt: Date | null
}

type AttemptRow = {
  Id: string
  SessionId: string
  ClipKey: string
  DrillType: ListeningDrillType
  AnswerJson: string
  AnswerMode: ListeningAnswerMode
  CorrectGist: boolean | null
  CorrectDetails: boolean | null
  ReplayCount: number
  SlowerReplayUsed: boolean
  TranscriptRevealed: boolean
  ResponseLatencyMs: number | null
  EvaluationJson: string | null
  CreatedAt: Date
}

function mapSession(r: SessionRow): ListeningSession {
  let drillIds: string[] = []
  try {
    drillIds = JSON.parse(r.DrillIdsJson) as string[]
  } catch {
    drillIds = []
  }
  return {
    id: r.Id,
    userId: r.UserId,
    trackId: r.TrackId,
    scenarioId: r.ScenarioKey,
    category: r.Category,
    level: r.Level as ListeningSession['level'],
    drillIds,
    status: r.Status,
    clientSessionKey: r.ClientSessionKey,
    createdAt: r.CreatedAt.toISOString(),
    completedAt: r.CompletedAt ? r.CompletedAt.toISOString() : null,
  }
}

export async function insertListeningSession(
  pool: sql.ConnectionPool,
  row: {
    id?: string
    userId: string
    trackId: string | null
    scenarioKey: string | null
    category: string
    level: string
    drillIds: string[]
    status?: ListeningSessionStatus
    clientSessionKey?: string | null
  },
): Promise<string> {
  const id = row.id ?? newId()
  await pool
    .request()
    .input('id', id)
    .input('userId', row.userId)
    .input('trackId', row.trackId)
    .input('scenarioKey', row.scenarioKey)
    .input('category', row.category)
    .input('level', row.level)
    .input('drillIdsJson', JSON.stringify(row.drillIds))
    .input('status', row.status ?? 'in_progress')
    .input('clientSessionKey', row.clientSessionKey ?? null)
    .query(`
      INSERT INTO dbo.ListeningSessions (
        Id, UserId, TrackId, ScenarioKey, Category, Level, DrillIdsJson, Status, ClientSessionKey
      ) VALUES (
        @id, @userId, @trackId, @scenarioKey, @category, @level, @drillIdsJson, @status, @clientSessionKey
      )
    `)
  return id
}

export async function getListeningSessionById(
  pool: sql.ConnectionPool,
  userId: string,
  sessionId: string,
): Promise<ListeningSession | null> {
  const r = await pool
    .request()
    .input('id', sessionId)
    .input('userId', userId)
    .query<SessionRow>(
      `SELECT TOP 1 * FROM dbo.ListeningSessions WHERE Id = @id AND UserId = @userId`,
    )
  const row = r.recordset[0]
  return row ? mapSession(row) : null
}

export async function insertListeningAttempt(
  pool: sql.ConnectionPool,
  row: {
    id?: string
    sessionId: string
    clipKey: string
    drillType: ListeningDrillType
    answerJson: string
    answerMode: ListeningAnswerMode
    correctGist: boolean | null
    correctDetails: boolean | null
    replayCount: number
    slowerReplayUsed: boolean
    transcriptRevealed: boolean
    responseLatencyMs: number | null
    evaluationJson: string | null
  },
): Promise<string> {
  const id = row.id ?? newId()
  await pool
    .request()
    .input('id', id)
    .input('sessionId', row.sessionId)
    .input('clipKey', row.clipKey)
    .input('drillType', row.drillType)
    .input('answerJson', row.answerJson)
    .input('answerMode', row.answerMode)
    .input('correctGist', row.correctGist)
    .input('correctDetails', row.correctDetails)
    .input('replayCount', row.replayCount)
    .input('slowerReplayUsed', row.slowerReplayUsed ? 1 : 0)
    .input('transcriptRevealed', row.transcriptRevealed ? 1 : 0)
    .input('responseLatencyMs', row.responseLatencyMs)
    .input('evaluationJson', row.evaluationJson)
    .query(`
      INSERT INTO dbo.ListeningAttempts (
        Id, SessionId, ClipKey, DrillType, AnswerJson, AnswerMode,
        CorrectGist, CorrectDetails, ReplayCount, SlowerReplayUsed, TranscriptRevealed,
        ResponseLatencyMs, EvaluationJson
      ) VALUES (
        @id, @sessionId, @clipKey, @drillType, @answerJson, @answerMode,
        @correctGist, @correctDetails, @replayCount, @slowerReplayUsed, @transcriptRevealed,
        @responseLatencyMs, @evaluationJson
      )
    `)
  return id
}

export async function listListeningAttemptsForSession(
  pool: sql.ConnectionPool,
  sessionId: string,
): Promise<ListeningAttempt[]> {
  const r = await pool
    .request()
    .input('sessionId', sessionId)
    .query<AttemptRow>(
      `SELECT * FROM dbo.ListeningAttempts WHERE SessionId = @sessionId ORDER BY CreatedAt ASC`,
    )
  return r.recordset.map((row) => ({
    id: row.Id,
    sessionId: row.SessionId,
    clipId: row.ClipKey,
    drillType: row.DrillType,
    answer: JSON.parse(row.AnswerJson) as ListeningAttempt['answer'],
    answerMode: row.AnswerMode,
    correctGist: row.CorrectGist,
    correctDetails: row.CorrectDetails,
    replayCount: row.ReplayCount,
    slowerReplayUsed: row.SlowerReplayUsed,
    transcriptRevealed: row.TranscriptRevealed,
    responseLatencyMs: row.ResponseLatencyMs,
    evaluation: row.EvaluationJson ? (JSON.parse(row.EvaluationJson) as ListeningAttempt['evaluation']) : null,
    createdAt: row.CreatedAt.toISOString(),
  }))
}

export async function finalizeListeningSessionRow(
  pool: sql.ConnectionPool,
  userId: string,
  sessionId: string,
  status: 'completed' | 'abandoned' = 'completed',
): Promise<boolean> {
  const r = await pool
    .request()
    .input('id', sessionId)
    .input('userId', userId)
    .input('status', status)
    .query(
      `UPDATE dbo.ListeningSessions SET Status = @status, CompletedAt = SYSUTCDATETIME() WHERE Id = @id AND UserId = @userId`,
    )
  return (r.rowsAffected[0] ?? 0) > 0
}

export async function insertListeningReportRow(
  pool: sql.ConnectionPool,
  row: {
    id?: string
    sessionId: string
    userId: string
    summaryJson: string
    dimensionsJson: string | null
    weakAreasJson: string | null
    missedDetailsJson: string | null
    recommendedNextJson: string | null
    relatedPracticeLoopsJson: string | null
  },
): Promise<string> {
  const id = row.id ?? newId()
  await pool
    .request()
    .input('id', id)
    .input('sessionId', row.sessionId)
    .input('userId', row.userId)
    .input('summaryJson', row.summaryJson)
    .input('dimensionsJson', row.dimensionsJson)
    .input('weakAreasJson', row.weakAreasJson)
    .input('missedDetailsJson', row.missedDetailsJson)
    .input('recommendedNextJson', row.recommendedNextJson)
    .input('relatedPracticeLoopsJson', row.relatedPracticeLoopsJson)
    .query(`
      INSERT INTO dbo.ListeningReports (
        Id, SessionId, UserId, SummaryJson, DimensionsJson, WeakAreasJson,
        MissedDetailsJson, RecommendedNextJson, RelatedPracticeLoopsJson
      ) VALUES (
        @id, @sessionId, @userId, @summaryJson, @dimensionsJson, @weakAreasJson,
        @missedDetailsJson, @recommendedNextJson, @relatedPracticeLoopsJson
      )
    `)
  return id
}

export async function getListeningReportRowBySessionId(
  pool: sql.ConnectionPool,
  userId: string,
  sessionId: string,
): Promise<{
  summaryJson: string
  dimensionsJson: string | null
  weakAreasJson: string | null
  missedDetailsJson: string | null
  recommendedNextJson: string | null
  relatedPracticeLoopsJson: string | null
  createdAt: string
} | null> {
  const r = await pool
    .request()
    .input('sessionId', sessionId)
    .input('userId', userId)
    .query<{
      SummaryJson: string
      DimensionsJson: string | null
      WeakAreasJson: string | null
      MissedDetailsJson: string | null
      RecommendedNextJson: string | null
      RelatedPracticeLoopsJson: string | null
      CreatedAt: Date
    }>(
      `SELECT TOP 1 SummaryJson, DimensionsJson, WeakAreasJson, MissedDetailsJson, RecommendedNextJson, RelatedPracticeLoopsJson, CreatedAt
       FROM dbo.ListeningReports WHERE SessionId = @sessionId AND UserId = @userId`,
    )
  const row = r.recordset[0]
  if (!row) return null
  return {
    summaryJson: row.SummaryJson,
    dimensionsJson: row.DimensionsJson,
    weakAreasJson: row.WeakAreasJson,
    missedDetailsJson: row.MissedDetailsJson,
    recommendedNextJson: row.RecommendedNextJson,
    relatedPracticeLoopsJson: row.RelatedPracticeLoopsJson,
    createdAt: row.CreatedAt.toISOString(),
  }
}

export async function listListeningWeaknessSignals(
  pool: sql.ConnectionPool,
  userId: string,
  limit = 40,
): Promise<ListeningWeaknessSignal[]> {
  const r = await pool
    .request()
    .input('userId', userId)
    .input('limit', limit)
    .query<{
      Id: string
      UserId: string
      WeaknessKey: string
      Severity: number
      EvidenceJson: string | null
      LastSeenAt: Date
      UpdatedAt: Date
    }>(
      `SELECT TOP (@limit) * FROM dbo.ListeningWeaknessSignals WHERE UserId = @userId ORDER BY Severity DESC, LastSeenAt DESC`,
    )
  return r.recordset.map((row) => ({
    id: row.Id,
    userId: row.UserId,
    weaknessKey: row.WeaknessKey,
    severity: row.Severity,
    evidence: row.EvidenceJson ? (JSON.parse(row.EvidenceJson) as Record<string, unknown>) : null,
    lastSeenAt: row.LastSeenAt.toISOString(),
    updatedAt: row.UpdatedAt.toISOString(),
  }))
}

export async function upsertListeningWeaknessSignal(
  pool: sql.ConnectionPool,
  row: {
    userId: string
    weaknessKey: string
    severity: number
    evidenceJson: string | null
  },
): Promise<void> {
  const id = newId()
  await pool
    .request()
    .input('id', id)
    .input('userId', row.userId)
    .input('weaknessKey', row.weaknessKey)
    .input('severity', row.severity)
    .input('evidenceJson', row.evidenceJson)
    .query(`
      MERGE dbo.ListeningWeaknessSignals AS tgt
      USING (SELECT @userId AS UserId, @weaknessKey AS WeaknessKey) AS src
      ON tgt.UserId = src.UserId AND tgt.WeaknessKey = src.WeaknessKey
      WHEN MATCHED THEN
        UPDATE SET
          Severity = CASE WHEN @severity > tgt.Severity THEN @severity ELSE tgt.Severity END,
          EvidenceJson = COALESCE(@evidenceJson, tgt.EvidenceJson),
          LastSeenAt = SYSUTCDATETIME(),
          UpdatedAt = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (Id, UserId, WeaknessKey, Severity, EvidenceJson, LastSeenAt, UpdatedAt)
        VALUES (@id, @userId, @weaknessKey, @severity, @evidenceJson, SYSUTCDATETIME(), SYSUTCDATETIME());
    `)
}

export async function listListeningClipLibrary(
  pool: sql.ConnectionPool,
  filter?: { scenarioKey?: string; level?: string; drillType?: ListeningDrillType },
): Promise<ListeningClip[]> {
  let q = `SELECT ClipKey, ScenarioKey, Category, Level, DrillType, SpeakerProfileJson, Transcript, NormalizedTranscript,
                  TargetMeaning, KeyDetailsJson, ResponseExpectationJson, AudioUrl, SlowerAudioUrl, MetadataJson
           FROM dbo.ListeningClipLibrary WHERE 1=1`
  const req = pool.request()
  if (filter?.scenarioKey) {
    q += ` AND ScenarioKey = @scenarioKey`
    req.input('scenarioKey', filter.scenarioKey)
  }
  if (filter?.level) {
    q += ` AND Level = @level`
    req.input('level', filter.level)
  }
  if (filter?.drillType) {
    q += ` AND DrillType = @drillType`
    req.input('drillType', filter.drillType)
  }
  const r = await req.query<{
    ClipKey: string
    ScenarioKey: string
    Category: string | null
    Level: string
    DrillType: ListeningDrillType
    SpeakerProfileJson: string | null
    Transcript: string
    NormalizedTranscript: string | null
    TargetMeaning: string | null
    KeyDetailsJson: string | null
    ResponseExpectationJson: string | null
    AudioUrl: string | null
    SlowerAudioUrl: string | null
    MetadataJson: string | null
  }>(q)
  return r.recordset.map((row) => ({
    id: row.ClipKey,
    scenarioId: row.ScenarioKey,
    category: row.Category ?? 'general',
    level: row.Level as ListeningClip['level'],
    drillType: row.DrillType,
    speakerProfile: row.SpeakerProfileJson ? (JSON.parse(row.SpeakerProfileJson) as ListeningClip['speakerProfile']) : null,
    transcript: row.Transcript,
    normalizedTranscript: row.NormalizedTranscript,
    targetMeaning: row.TargetMeaning ?? '',
    keyDetails: row.KeyDetailsJson ? (JSON.parse(row.KeyDetailsJson) as string[]) : [],
    responseExpectation: row.ResponseExpectationJson,
    audioUrl: row.AudioUrl,
    slowerAudioUrl: row.SlowerAudioUrl ?? null,
    metadata: row.MetadataJson ? (JSON.parse(row.MetadataJson) as Record<string, unknown>) : {},
  }))
}
