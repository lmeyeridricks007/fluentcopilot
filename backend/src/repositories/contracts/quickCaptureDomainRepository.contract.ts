import type sql from 'mssql'
import type {
  CaptureItem,
  CaptureStatus,
  DailyCaptureBundle,
  PersonalizedPracticePack,
  PlaceItem,
} from '../../domain/quickCapture/captureDomainTypes'

/** Connection handle for repository implementations (Azure SQL pool per request). */
export type SqlPool = sql.ConnectionPool

export type CreateCaptureItemInput = Omit<CaptureItem, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
}

export type UpdateCaptureItemInput = {
  id: string
  userId: string
  patch: Partial<
    Pick<
      CaptureItem,
      | 'status'
      | 'rawText'
      | 'cleanedText'
      | 'title'
      | 'description'
      | 'sourceSignals'
      | 'placeId'
      | 'placeLabel'
      | 'scenarioTags'
      | 'skillTags'
      | 'difficultyFeelings'
      | 'metadata'
      | 'media'
      | 'enrichment'
      | 'practiceRefs'
      | 'archivedAt'
    >
  >
}

export type ListCapturesOptions = {
  limit?: number
  offset?: number
}

export interface ICaptureItemRepository {
  createCaptureItem(pool: SqlPool, item: CreateCaptureItemInput): Promise<CaptureItem>
  updateCaptureItem(pool: SqlPool, input: UpdateCaptureItemInput): Promise<CaptureItem | null>
  getCaptureById(pool: SqlPool, userId: string, captureId: string): Promise<CaptureItem | null>
  listCapturesByUser(pool: SqlPool, userId: string, options?: ListCapturesOptions): Promise<CaptureItem[]>
  listCapturesByDate(pool: SqlPool, userId: string, captureDate: string, options?: ListCapturesOptions): Promise<CaptureItem[]>
  listCapturesByStatus(
    pool: SqlPool,
    userId: string,
    status: CaptureStatus | CaptureStatus[],
    options?: ListCapturesOptions,
  ): Promise<CaptureItem[]>
}

export type CreatePlaceItemInput = Omit<PlaceItem, 'id' | 'createdAt'> & {
  id?: string
  lastUsedAt?: string | null
}

export interface IPlaceItemRepository {
  createPlaceItem(pool: SqlPool, place: CreatePlaceItemInput): Promise<PlaceItem>
  listPlaces(pool: SqlPool, userId: string, options?: ListCapturesOptions): Promise<PlaceItem[]>
}

export type CreateDailyCaptureBundleInput = Omit<DailyCaptureBundle, 'id'> & { id?: string }

export interface IDailyCaptureBundleRepository {
  createDailyCaptureBundle(pool: SqlPool, bundle: CreateDailyCaptureBundleInput): Promise<DailyCaptureBundle>
  getDailyCaptureBundleByDate(pool: SqlPool, userId: string, date: string): Promise<DailyCaptureBundle | null>
}

export type SavePersonalizedPracticePackInput = PersonalizedPracticePack & { id?: string }

export interface IPersonalizedPracticePackRepository {
  savePersonalizedPracticePack(pool: SqlPool, pack: SavePersonalizedPracticePackInput): Promise<PersonalizedPracticePack>
  getPracticePackById(pool: SqlPool, userId: string, packId: string): Promise<PersonalizedPracticePack | null>
  listPracticePacksByUser(pool: SqlPool, userId: string, options?: ListCapturesOptions): Promise<PersonalizedPracticePack[]>
  markPracticePackCompleted(pool: SqlPool, userId: string, packId: string): Promise<PersonalizedPracticePack | null>
}

/**
 * Aggregate persistence port for Quick Capture domain + personalized practice packs.
 * Implementations may split internally; callers depend on this facade for DI.
 */
export interface IQuickCaptureDomainRepository
  extends ICaptureItemRepository,
    IPlaceItemRepository,
    IDailyCaptureBundleRepository,
    IPersonalizedPracticePackRepository {}
