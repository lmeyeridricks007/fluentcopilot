import { newId } from '../../shared/ids'
import type {
  CaptureItem,
  CaptureStatus,
  DailyCaptureBundle,
  PersonalizedPracticePack,
  PlaceItem,
} from '../../domain/quickCapture/captureDomainTypes'
import {
  captureItemFromRow,
  captureItemToPersistencePayload,
  dailyBundleFromRow,
  placeItemFromRow,
  placeItemToPersistence,
  practicePackFromRow,
  practicePackToPersistence,
} from '../../domain/quickCapture/captureDomainMappers'
import type {
  CreateCaptureItemInput,
  CreateDailyCaptureBundleInput,
  CreatePlaceItemInput,
  IQuickCaptureDomainRepository,
  ListCapturesOptions,
  SavePersonalizedPracticePackInput,
  SqlPool,
  UpdateCaptureItemInput,
} from '../contracts/quickCaptureDomainRepository.contract'

/** Row shapes returned by mssql driver (subset). */
type SqlCaptureRow = Parameters<typeof captureItemFromRow>[0]
type SqlPlaceRow = Parameters<typeof placeItemFromRow>[0]
type SqlPracticePackRow = Parameters<typeof practicePackFromRow>[0]

const DEFAULT_LIMIT = 200

function rowLimit(n?: number): number {
  return Math.min(500, Math.max(1, n ?? DEFAULT_LIMIT))
}

function nowIso(): string {
  return new Date().toISOString()
}

function mergeCapturePatch(current: CaptureItem, patch: UpdateCaptureItemInput['patch']): CaptureItem {
  const next: CaptureItem = { ...current, updatedAt: nowIso() }
  const rec = next as Record<string, unknown>
  for (const [key, val] of Object.entries(patch)) {
    if (val === undefined) continue
    rec[key] = val
  }
  return next as CaptureItem
}

export class QuickCaptureDomainSqlRepository implements IQuickCaptureDomainRepository {
  async createCaptureItem(pool: SqlPool, item: CreateCaptureItemInput): Promise<CaptureItem> {
    const id = item.id ?? newId()
    const createdAt = nowIso()
    const updatedAt = createdAt
    const full: CaptureItem = {
      id,
      userId: item.userId,
      type: item.type,
      status: item.status,
      createdAt,
      updatedAt,
      captureDate: item.captureDate,
      rawText: item.rawText ?? null,
      cleanedText: item.cleanedText ?? null,
      title: item.title ?? null,
      description: item.description ?? null,
      sourceSignals: item.sourceSignals ?? [],
      placeId: item.placeId ?? null,
      placeLabel: item.placeLabel ?? null,
      scenarioTags: item.scenarioTags ?? [],
      skillTags: item.skillTags ?? [],
      difficultyFeelings: item.difficultyFeelings ?? [],
      metadata: item.metadata ?? {},
      media: item.media ?? [],
      enrichment: item.enrichment ?? null,
      practiceRefs: item.practiceRefs ?? null,
      archivedAt: item.archivedAt ?? null,
    }
    const p = captureItemToPersistencePayload(full)

    await pool
      .request()
      .input('id', id)
      .input('userId', item.userId)
      .input('type', p.type)
      .input('status', p.status)
      .input('captureDate', item.captureDate)
      .input('rawText', p.rawText)
      .input('cleanedText', p.cleanedText)
      .input('title', p.title)
      .input('description', p.description)
      .input('sourceSignalsJson', p.sourceSignalsJson)
      .input('scenarioTagsJson', p.scenarioTagsJson)
      .input('skillTagsJson', p.skillTagsJson)
      .input('difficultyFeelingsJson', p.difficultyFeelingsJson)
      .input('placeId', p.placeId)
      .input('placeLabel', p.placeLabel)
      .input('metadataJson', p.metadataJson)
      .input('mediaJson', p.mediaJson)
      .input('enrichmentJson', p.enrichmentJson)
      .input('practiceRefsJson', p.practiceRefsJson)
      .input('archivedAt', p.archivedAt)
      .query(`
        INSERT INTO dbo.UserCaptureItems (
          Id, UserId, Type, Status, CaptureDate,
          RawText, CleanedText, Title, Description,
          SourceSignalsJson, ScenarioTagsJson, SkillTagsJson, DifficultyFeelingsJson,
          PlaceId, PlaceLabel, MetadataJson, MediaJson, EnrichmentJson, PracticeRefsJson,
          CreatedAt, UpdatedAt, ArchivedAt
        ) VALUES (
          @id, @userId, @type, @status, @captureDate,
          @rawText, @cleanedText, @title, @description,
          @sourceSignalsJson, @scenarioTagsJson, @skillTagsJson, @difficultyFeelingsJson,
          @placeId, @placeLabel, @metadataJson, @mediaJson, @enrichmentJson, @practiceRefsJson,
          SYSUTCDATETIME(), SYSUTCDATETIME(), @archivedAt
        )
      `)

    const row = await this.getCaptureRow(pool, item.userId, id)
    if (!row) throw new Error('createCaptureItem: row missing after insert')
    return captureItemFromRow(row)
  }

  async updateCaptureItem(pool: SqlPool, input: UpdateCaptureItemInput): Promise<CaptureItem | null> {
    const current = await this.getCaptureById(pool, input.userId, input.id)
    if (!current) return null
    const merged = mergeCapturePatch(current, input.patch)
    const p = captureItemToPersistencePayload(merged)
    await pool
      .request()
      .input('id', merged.id)
      .input('userId', merged.userId)
      .input('status', p.status)
      .input('rawText', p.rawText)
      .input('cleanedText', p.cleanedText)
      .input('title', p.title)
      .input('description', p.description)
      .input('sourceSignalsJson', p.sourceSignalsJson)
      .input('scenarioTagsJson', p.scenarioTagsJson)
      .input('skillTagsJson', p.skillTagsJson)
      .input('difficultyFeelingsJson', p.difficultyFeelingsJson)
      .input('placeId', p.placeId)
      .input('placeLabel', p.placeLabel)
      .input('metadataJson', p.metadataJson)
      .input('mediaJson', p.mediaJson)
      .input('enrichmentJson', p.enrichmentJson)
      .input('practiceRefsJson', p.practiceRefsJson)
      .input('archivedAt', p.archivedAt)
      .query(`
        UPDATE dbo.UserCaptureItems SET
          Status = @status,
          RawText = @rawText,
          CleanedText = @cleanedText,
          Title = @title,
          Description = @description,
          SourceSignalsJson = @sourceSignalsJson,
          ScenarioTagsJson = @scenarioTagsJson,
          SkillTagsJson = @skillTagsJson,
          DifficultyFeelingsJson = @difficultyFeelingsJson,
          PlaceId = @placeId,
          PlaceLabel = @placeLabel,
          MetadataJson = @metadataJson,
          MediaJson = @mediaJson,
          EnrichmentJson = @enrichmentJson,
          PracticeRefsJson = @practiceRefsJson,
          ArchivedAt = @archivedAt,
          UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @id AND UserId = @userId
      `)
    return this.getCaptureById(pool, input.userId, input.id)
  }

  async getCaptureById(pool: SqlPool, userId: string, captureId: string): Promise<CaptureItem | null> {
    const row = await this.getCaptureRow(pool, userId, captureId)
    return row ? captureItemFromRow(row) : null
  }

  async listCapturesByUser(pool: SqlPool, userId: string, options?: ListCapturesOptions): Promise<CaptureItem[]> {
    const lim = rowLimit(options?.limit)
    const r = await pool.request().input('userId', userId).input('lim', lim).query(this.captureSelectSql + `
      WHERE UserId = @userId
      ORDER BY CreatedAt DESC
    `)
    return (r.recordset as SqlCaptureRow[]).map(captureItemFromRow)
  }

  async listCapturesByDate(pool: SqlPool, userId: string, captureDate: string, options?: ListCapturesOptions): Promise<CaptureItem[]> {
    const lim = rowLimit(options?.limit)
    const r = await pool
      .request()
      .input('userId', userId)
      .input('d', captureDate)
      .input('lim', lim)
      .query(this.captureSelectSql + `
      WHERE UserId = @userId AND CaptureDate = @d
      ORDER BY CreatedAt DESC
    `)
    return (r.recordset as SqlCaptureRow[]).map(captureItemFromRow)
  }

  async listCapturesByStatus(
    pool: SqlPool,
    userId: string,
    status: CaptureStatus | CaptureStatus[],
    options?: ListCapturesOptions,
  ): Promise<CaptureItem[]> {
    const statuses = Array.isArray(status) ? status : [status]
    if (statuses.length === 0) return []
    const lim = rowLimit(options?.limit)
    const req = pool.request().input('userId', userId).input('lim', lim)
    const placeholders = statuses.map((_, i) => `@s${i}`).join(', ')
    statuses.forEach((s, i) => req.input(`s${i}`, s))
    const r = await req.query(this.captureSelectSql + `
      WHERE UserId = @userId AND Status IN (${placeholders})
      ORDER BY UpdatedAt DESC
    `)
    return (r.recordset as SqlCaptureRow[]).map(captureItemFromRow)
  }

  async createPlaceItem(pool: SqlPool, place: CreatePlaceItemInput): Promise<PlaceItem> {
    const id = place.id ?? newId()
    const ts = nowIso()
    const fullPlace: PlaceItem = {
      id,
      userId: place.userId,
      label: place.label,
      category: place.category,
      createdAt: ts,
      lastUsedAt: place.lastUsedAt ?? null,
      scenarioTags: place.scenarioTags ?? [],
    }
    const p = placeItemToPersistence(fullPlace)
    await pool
      .request()
      .input('id', id)
      .input('userId', place.userId)
      .input('label', p.label)
      .input('category', p.category)
      .input('scenarioTagsJson', p.scenarioTagsJson)
      .input('lastUsedAt', p.lastUsedAt)
      .query(`
        INSERT INTO dbo.UserPlaceItems (Id, UserId, Label, Category, ScenarioTagsJson, CreatedAt, LastUsedAt)
        VALUES (@id, @userId, @label, @category, @scenarioTagsJson, SYSUTCDATETIME(), @lastUsedAt)
      `)
    const row = await this.getPlaceRow(pool, place.userId, id)
    if (!row) throw new Error('createPlaceItem: row missing')
    return placeItemFromRow(row)
  }

  async listPlaces(pool: SqlPool, userId: string, options?: ListCapturesOptions): Promise<PlaceItem[]> {
    const lim = rowLimit(options?.limit)
    const r = await pool.request().input('userId', userId).input('lim', lim).query(`
      SELECT TOP (@lim) Id, UserId, Label, Category, CreatedAt, LastUsedAt, ScenarioTagsJson
      FROM dbo.UserPlaceItems WHERE UserId = @userId ORDER BY CreatedAt DESC
    `)
    return (r.recordset as SqlPlaceRow[]).map(placeItemFromRow)
  }

  async createDailyCaptureBundle(pool: SqlPool, bundle: CreateDailyCaptureBundleInput): Promise<DailyCaptureBundle> {
    const id = bundle.id ?? newId()
    await pool
      .request()
      .input('id', id)
      .input('userId', bundle.userId)
      .input('bundleDate', bundle.date)
      .input('captureIdsJson', JSON.stringify(bundle.captureIds))
      .input('themeClustersJson', JSON.stringify(bundle.themeClusters))
      .input('generatedIds', JSON.stringify(bundle.generatedPracticePackIds))
      .query(`
        MERGE dbo.UserDailyCaptureBundles AS tgt
        USING (SELECT @userId AS UserId, CAST(@bundleDate AS DATE) AS BundleDate) AS src
        ON tgt.UserId = src.UserId AND tgt.BundleDate = src.BundleDate
        WHEN MATCHED THEN
          UPDATE SET
            CaptureIdsJson = @captureIdsJson,
            ThemeClustersJson = @themeClustersJson,
            GeneratedPracticePackIdsJson = @generatedIds
        WHEN NOT MATCHED BY TARGET THEN
          INSERT (Id, UserId, BundleDate, CaptureIdsJson, ThemeClustersJson, GeneratedPracticePackIdsJson, CreatedAt)
          VALUES (@id, @userId, CAST(@bundleDate AS DATE), @captureIdsJson, @themeClustersJson, @generatedIds, SYSUTCDATETIME());
      `)
    const got = await this.getDailyCaptureBundleByDate(pool, bundle.userId, bundle.date)
    if (!got) throw new Error('createDailyCaptureBundle: read-back failed')
    return got
  }

  async getDailyCaptureBundleByDate(pool: SqlPool, userId: string, date: string): Promise<DailyCaptureBundle | null> {
    const r = await pool.request().input('userId', userId).input('d', date).query(`
      SELECT TOP 1 Id, UserId, BundleDate, CaptureIdsJson, ThemeClustersJson, GeneratedPracticePackIdsJson
      FROM dbo.UserDailyCaptureBundles WHERE UserId = @userId AND BundleDate = @d
    `)
    const row = r.recordset[0] as
      | {
          Id: string
          UserId: string
          BundleDate: Date
          CaptureIdsJson: string | null
          ThemeClustersJson: string | null
          GeneratedPracticePackIdsJson: string | null
        }
      | undefined
    return row ? dailyBundleFromRow(row) : null
  }

  async savePersonalizedPracticePack(pool: SqlPool, pack: SavePersonalizedPracticePackInput): Promise<PersonalizedPracticePack> {
    const id = pack.id ?? newId()
    const p = practicePackToPersistence({ ...pack, id })
    await pool
      .request()
      .input('id', id)
      .input('userId', pack.userId)
      .input('packDate', pack.date)
      .input('sourceCaptureIdsJson', p.sourceCaptureIdsJson)
      .input('clusterIdsJson', p.clusterIdsJson)
      .input('title', p.title)
      .input('subtitle', p.subtitle)
      .input('estimatedMinutes', p.estimatedMinutes)
      .input('level', p.level)
      .input('itemsJson', p.itemsJson)
      .input('xpPotential', p.xpPotential)
      .input('status', p.status)
      .input('completedAt', p.completedAt)
      .query(`
        MERGE dbo.UserPersonalizedPracticePacks AS tgt
        USING (SELECT @id AS Id) AS src
        ON tgt.Id = src.Id
        WHEN MATCHED THEN
          UPDATE SET
            SourceCaptureIdsJson = @sourceCaptureIdsJson,
            ClusterIdsJson = @clusterIdsJson,
            Title = @title,
            Subtitle = @subtitle,
            EstimatedMinutes = @estimatedMinutes,
            Level = @level,
            ItemsJson = @itemsJson,
            XpPotential = @xpPotential,
            Status = @status,
            CompletedAt = @completedAt
        WHEN NOT MATCHED BY TARGET THEN
          INSERT (Id, UserId, PackDate, SourceCaptureIdsJson, ClusterIdsJson, Title, Subtitle, EstimatedMinutes, Level, ItemsJson, XpPotential, Status, CreatedAt, CompletedAt)
          VALUES (@id, @userId, CAST(@packDate AS DATE), @sourceCaptureIdsJson, @clusterIdsJson, @title, @subtitle, @estimatedMinutes, @level, @itemsJson, @xpPotential, @status, SYSUTCDATETIME(), @completedAt);
      `)
    const out = await this.getPracticePackById(pool, pack.userId, id)
    if (!out) throw new Error('savePersonalizedPracticePack: read-back failed')
    return out
  }

  async getPracticePackById(pool: SqlPool, userId: string, packId: string): Promise<PersonalizedPracticePack | null> {
    const r = await pool.request().input('userId', userId).input('id', packId).query(`
      SELECT TOP 1 Id, UserId, PackDate, SourceCaptureIdsJson, ClusterIdsJson, Title, Subtitle,
        EstimatedMinutes, Level, ItemsJson, XpPotential, Status, CreatedAt, CompletedAt
      FROM dbo.UserPersonalizedPracticePacks WHERE Id = @id AND UserId = @userId
    `)
    const row = r.recordset[0] as SqlPracticePackRow | undefined
    return row ? practicePackFromRow(row) : null
  }

  async listPracticePacksByUser(pool: SqlPool, userId: string, options?: ListCapturesOptions): Promise<PersonalizedPracticePack[]> {
    const lim = rowLimit(options?.limit)
    const r = await pool.request().input('userId', userId).input('lim', lim).query(`
      SELECT TOP (@lim) Id, UserId, PackDate, SourceCaptureIdsJson, ClusterIdsJson, Title, Subtitle,
        EstimatedMinutes, Level, ItemsJson, XpPotential, Status, CreatedAt, CompletedAt
      FROM dbo.UserPersonalizedPracticePacks WHERE UserId = @userId ORDER BY PackDate DESC, CreatedAt DESC
    `)
    return (r.recordset as SqlPracticePackRow[]).map((row) => practicePackFromRow(row))
  }

  async markPracticePackCompleted(pool: SqlPool, userId: string, packId: string): Promise<PersonalizedPracticePack | null> {
    await pool
      .request()
      .input('id', packId)
      .input('userId', userId)
      .query(`
        UPDATE dbo.UserPersonalizedPracticePacks
        SET Status = N'completed', CompletedAt = SYSUTCDATETIME()
        WHERE Id = @id AND UserId = @userId
      `)
    return this.getPracticePackById(pool, userId, packId)
  }

  private readonly captureSelectSql = `
    SELECT TOP (@lim)
      Id, UserId, Type, Status, CaptureDate, CreatedAt, UpdatedAt,
      RawText, CleanedText, Title, Description,
      SourceSignalsJson, ScenarioTagsJson, SkillTagsJson, DifficultyFeelingsJson,
      PlaceId, PlaceLabel, MetadataJson, MediaJson, EnrichmentJson, PracticeRefsJson, ArchivedAt
    FROM dbo.UserCaptureItems
  `

  private async getCaptureRow(pool: SqlPool, userId: string, captureId: string): Promise<SqlCaptureRow | null> {
    const r = await pool.request().input('userId', userId).input('id', captureId).query(`
      SELECT TOP 1
        Id, UserId, Type, Status, CaptureDate, CreatedAt, UpdatedAt,
        RawText, CleanedText, Title, Description,
        SourceSignalsJson, ScenarioTagsJson, SkillTagsJson, DifficultyFeelingsJson,
        PlaceId, PlaceLabel, MetadataJson, MediaJson, EnrichmentJson, PracticeRefsJson, ArchivedAt
      FROM dbo.UserCaptureItems WHERE Id = @id AND UserId = @userId
    `)
    return (r.recordset[0] as SqlCaptureRow) ?? null
  }

  private async getPlaceRow(pool: SqlPool, userId: string, placeId: string): Promise<SqlPlaceRow | null> {
    const r = await pool.request().input('userId', userId).input('id', placeId).query(`
      SELECT TOP 1 Id, UserId, Label, Category, CreatedAt, LastUsedAt, ScenarioTagsJson
      FROM dbo.UserPlaceItems WHERE Id = @id AND UserId = @userId
    `)
    return (r.recordset[0] as SqlPlaceRow) ?? null
  }
}

export function createQuickCaptureDomainRepository(): IQuickCaptureDomainRepository {
  return new QuickCaptureDomainSqlRepository()
}
