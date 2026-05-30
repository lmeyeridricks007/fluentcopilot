import type {
  CaptureEnrichment,
  CaptureItem,
  CaptureMedia,
  CaptureSourceSignal,
  CaptureStatus,
  CaptureType,
  DailyCaptureBundle,
  DailyCaptureCluster,
  DifficultyFeeling,
  PersonalizedPracticeItem,
  PersonalizedPracticeItemType,
  PersonalizedPracticePack,
  PersonalizedPracticePackStatus,
  PlaceItem,
} from './captureDomainTypes'

const CAPTURE_TYPES = new Set<string>([
  'save_word',
  'save_phrase',
  'photo_text',
  'add_place',
  'paste_text',
  'log_struggle',
  'voice_note',
])

const CAPTURE_STATUSES = new Set<string>([
  'new',
  'enriched',
  'ready_for_practice',
  'included_in_practice',
  'practiced',
  'saved_long_term',
  'archived',
])

const SOURCE_SIGNALS = new Set<string>([
  'heard',
  'read',
  'tried_to_say',
  'spoken_about',
  'uploaded',
  'pasted',
])

const DIFFICULTY = new Set<string>([
  'confused',
  'nervous',
  'froze',
  'rushed',
  'embarrassed',
  'unsure',
  'missed_it',
  'none',
])

const PACK_STATUS = new Set<string>(['ready', 'started', 'completed', 'archived'])

const PRACTICE_ITEM_TYPES = new Set<string>([
  'word_rep',
  'phrase_rep',
  'correction_rep',
  'mini_scenario',
  'read_aloud',
  'listening_burst',
  'coach_debrief',
])

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string')
}

function asSourceSignals(v: unknown): CaptureSourceSignal[] {
  return asStringArray(v).filter((x): x is CaptureSourceSignal => SOURCE_SIGNALS.has(x))
}

function asDifficulty(v: unknown): DifficultyFeeling[] {
  return asStringArray(v).filter((x): x is DifficultyFeeling => DIFFICULTY.has(x))
}

function parseMedia(v: unknown): CaptureMedia[] {
  if (!Array.isArray(v)) return []
  const out: CaptureMedia[] = []
  for (const m of v) {
    if (!m || typeof m !== 'object') continue
    const o = m as Record<string, unknown>
    const kind = o.kind === 'image' || o.kind === 'audio' ? o.kind : null
    const url = typeof o.url === 'string' ? o.url : ''
    const mimeType = typeof o.mimeType === 'string' ? o.mimeType : ''
    if (!kind || !url) continue
    out.push({
      kind,
      url,
      mimeType,
      durationMs: typeof o.durationMs === 'number' ? o.durationMs : null,
      waveformUrl: typeof o.waveformUrl === 'string' ? o.waveformUrl : null,
      transcriptionText: typeof o.transcriptionText === 'string' ? o.transcriptionText : null,
      ocrText: typeof o.ocrText === 'string' ? o.ocrText : null,
    })
  }
  return out
}

function parseEnrichment(v: unknown): CaptureEnrichment | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const languageDetected = typeof o.languageDetected === 'string' ? o.languageDetected : 'nl'
  return {
    languageDetected,
    likelyMeaning: typeof o.likelyMeaning === 'string' ? o.likelyMeaning : null,
    englishGloss: typeof o.englishGloss === 'string' ? o.englishGloss : null,
    normalizedDutch: typeof o.normalizedDutch === 'string' ? o.normalizedDutch : null,
    likelyScenario: typeof o.likelyScenario === 'string' ? o.likelyScenario : null,
    likelyPlaceType: typeof o.likelyPlaceType === 'string' ? o.likelyPlaceType : null,
    likelySkillImpacts: asStringArray(o.likelySkillImpacts),
    vocabularyCandidates: asStringArray(o.vocabularyCandidates),
    phraseCandidates: asStringArray(o.phraseCandidates),
    confidence: typeof o.confidence === 'number' && Number.isFinite(o.confidence) ? o.confidence : 0,
    llmNotes: Array.isArray(o.llmNotes) ? o.llmNotes.filter((x): x is string => typeof x === 'string') : null,
    needsReview: typeof o.needsReview === 'boolean' ? o.needsReview : null,
  }
}

export function captureItemFromRow(row: {
  Id: string
  UserId: string
  Type: string
  Status: string
  CaptureDate: Date
  CreatedAt: Date
  UpdatedAt: Date
  RawText: string | null
  CleanedText: string | null
  Title: string | null
  Description: string | null
  SourceSignalsJson: string | null
  ScenarioTagsJson: string | null
  SkillTagsJson: string | null
  DifficultyFeelingsJson: string | null
  PlaceId: string | null
  PlaceLabel: string | null
  MetadataJson: string | null
  MediaJson: string | null
  EnrichmentJson: string | null
  PracticeRefsJson: string | null
  ArchivedAt: Date | null
}): CaptureItem {
  const type = (CAPTURE_TYPES.has(row.Type) ? row.Type : 'paste_text') as CaptureType
  const status = (CAPTURE_STATUSES.has(row.Status) ? row.Status : 'new') as CaptureStatus
  let metadata: Record<string, unknown> = {}
  if (row.MetadataJson) {
    try {
      const p = JSON.parse(row.MetadataJson) as unknown
      if (p && typeof p === 'object' && !Array.isArray(p)) metadata = p as Record<string, unknown>
    } catch {
      metadata = {}
    }
  }
  let media: CaptureMedia[] = []
  if (row.MediaJson) {
    try {
      media = parseMedia(JSON.parse(row.MediaJson) as unknown)
    } catch {
      media = []
    }
  }
  let sourceSignals: CaptureSourceSignal[] = []
  if (row.SourceSignalsJson) {
    try {
      sourceSignals = asSourceSignals(JSON.parse(row.SourceSignalsJson) as unknown)
    } catch {
      sourceSignals = []
    }
  }
  let scenarioTags: string[] = []
  if (row.ScenarioTagsJson) {
    try {
      scenarioTags = asStringArray(JSON.parse(row.ScenarioTagsJson) as unknown)
    } catch {
      scenarioTags = []
    }
  }
  let skillTags: string[] = []
  if (row.SkillTagsJson) {
    try {
      skillTags = asStringArray(JSON.parse(row.SkillTagsJson) as unknown)
    } catch {
      skillTags = []
    }
  }
  let difficultyFeelings: DifficultyFeeling[] = []
  if (row.DifficultyFeelingsJson) {
    try {
      difficultyFeelings = asDifficulty(JSON.parse(row.DifficultyFeelingsJson) as unknown)
    } catch {
      difficultyFeelings = []
    }
  }
  let practiceRefs: string[] | null = null
  if (row.PracticeRefsJson) {
    try {
      practiceRefs = asStringArray(JSON.parse(row.PracticeRefsJson) as unknown)
    } catch {
      practiceRefs = null
    }
  }
  let enrichment: CaptureEnrichment | null = null
  if (row.EnrichmentJson) {
    try {
      enrichment = parseEnrichment(JSON.parse(row.EnrichmentJson) as unknown)
    } catch {
      enrichment = null
    }
  }

  return {
    id: row.Id,
    userId: row.UserId,
    type,
    status,
    createdAt: row.CreatedAt.toISOString(),
    updatedAt: row.UpdatedAt.toISOString(),
    captureDate: row.CaptureDate.toISOString().slice(0, 10),
    rawText: row.RawText,
    cleanedText: row.CleanedText,
    title: row.Title,
    description: row.Description,
    sourceSignals,
    placeId: row.PlaceId,
    placeLabel: row.PlaceLabel,
    scenarioTags,
    skillTags,
    difficultyFeelings,
    metadata,
    media,
    enrichment,
    practiceRefs,
    archivedAt: row.ArchivedAt ? row.ArchivedAt.toISOString() : null,
  }
}

export function captureItemToPersistencePayload(item: CaptureItem): {
  type: CaptureType
  status: CaptureStatus
  captureDate: string
  rawText: string | null
  cleanedText: string | null
  title: string | null
  description: string | null
  sourceSignalsJson: string
  scenarioTagsJson: string
  skillTagsJson: string
  difficultyFeelingsJson: string
  placeId: string | null
  placeLabel: string | null
  metadataJson: string
  mediaJson: string
  enrichmentJson: string | null
  practiceRefsJson: string | null
  archivedAt: Date | null
} {
  return {
    type: item.type,
    status: item.status,
    captureDate: item.captureDate,
    rawText: item.rawText ?? null,
    cleanedText: item.cleanedText ?? null,
    title: item.title ?? null,
    description: item.description ?? null,
    sourceSignalsJson: JSON.stringify(item.sourceSignals),
    scenarioTagsJson: JSON.stringify(item.scenarioTags),
    skillTagsJson: JSON.stringify(item.skillTags),
    difficultyFeelingsJson: JSON.stringify(item.difficultyFeelings),
    placeId: item.placeId ?? null,
    placeLabel: item.placeLabel ?? null,
    metadataJson: JSON.stringify(item.metadata ?? {}),
    mediaJson: JSON.stringify(item.media ?? []),
    enrichmentJson: item.enrichment ? JSON.stringify(item.enrichment) : null,
    practiceRefsJson: item.practiceRefs?.length ? JSON.stringify(item.practiceRefs) : null,
    archivedAt: item.archivedAt ? new Date(item.archivedAt) : null,
  }
}

export function placeItemFromRow(row: {
  Id: string
  UserId: string
  Label: string
  Category: string
  CreatedAt: Date
  LastUsedAt: Date | null
  ScenarioTagsJson: string | null
}): PlaceItem {
  let scenarioTags: string[] = []
  if (row.ScenarioTagsJson) {
    try {
      scenarioTags = asStringArray(JSON.parse(row.ScenarioTagsJson) as unknown)
    } catch {
      scenarioTags = []
    }
  }
  return {
    id: row.Id,
    userId: row.UserId,
    label: row.Label,
    category: row.Category,
    createdAt: row.CreatedAt.toISOString(),
    lastUsedAt: row.LastUsedAt ? row.LastUsedAt.toISOString() : null,
    scenarioTags,
  }
}

export function placeItemToPersistence(p: PlaceItem): {
  label: string
  category: string
  scenarioTagsJson: string
  lastUsedAt: Date | null
} {
  return {
    label: p.label,
    category: p.category,
    scenarioTagsJson: JSON.stringify(p.scenarioTags),
    lastUsedAt: p.lastUsedAt ? new Date(p.lastUsedAt) : null,
  }
}

function parseClusters(json: string | null): DailyCaptureCluster[] {
  if (!json) return []
  try {
    const arr = JSON.parse(json) as unknown
    if (!Array.isArray(arr)) return []
    return arr
      .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
      .map((c) => ({
        id: typeof c.id === 'string' ? c.id : '',
        title: typeof c.title === 'string' ? c.title : '',
        summary: typeof c.summary === 'string' ? c.summary : '',
        scenarioTags: asStringArray(c.scenarioTags),
        relatedCaptureIds: asStringArray(c.relatedCaptureIds),
        priorityScore: typeof c.priorityScore === 'number' ? c.priorityScore : 0,
      }))
      .filter((c) => c.id.length > 0)
  } catch {
    return []
  }
}

export function dailyBundleFromRow(row: {
  Id: string
  UserId: string
  BundleDate: Date
  CaptureIdsJson: string | null
  ThemeClustersJson: string | null
  GeneratedPracticePackIdsJson: string | null
}): DailyCaptureBundle {
  let captureIds: string[] = []
  if (row.CaptureIdsJson) {
    try {
      captureIds = asStringArray(JSON.parse(row.CaptureIdsJson) as unknown)
    } catch {
      captureIds = []
    }
  }
  let generatedPracticePackIds: string[] = []
  if (row.GeneratedPracticePackIdsJson) {
    try {
      generatedPracticePackIds = asStringArray(JSON.parse(row.GeneratedPracticePackIdsJson) as unknown)
    } catch {
      generatedPracticePackIds = []
    }
  }
  return {
    id: row.Id,
    userId: row.UserId,
    date: row.BundleDate.toISOString().slice(0, 10),
    captureIds,
    themeClusters: parseClusters(row.ThemeClustersJson),
    generatedPracticePackIds,
  }
}

export function practicePackFromRow(row: {
  Id: string
  UserId: string
  PackDate: Date
  SourceCaptureIdsJson: string | null
  ClusterIdsJson: string | null
  Title: string
  Subtitle: string
  EstimatedMinutes: number
  Level: string
  ItemsJson: string | null
  XpPotential: number
  Status: string
  CreatedAt: Date
  CompletedAt: Date | null
}): PersonalizedPracticePack {
  const status = (PACK_STATUS.has(row.Status) ? row.Status : 'ready') as PersonalizedPracticePackStatus
  let items: PersonalizedPracticePack['items'] = []
  if (row.ItemsJson) {
    try {
      const arr = JSON.parse(row.ItemsJson) as unknown
      if (Array.isArray(arr)) {
        items = arr
          .filter((x): x is Record<string, unknown> => Boolean(x && typeof x === 'object'))
          .map((x) => {
            const rawType = typeof x.type === 'string' ? x.type : 'word_rep'
            const type = (PRACTICE_ITEM_TYPES.has(rawType) ? rawType : 'word_rep') as PersonalizedPracticeItemType
            const it: PersonalizedPracticeItem = {
              id: typeof x.id === 'string' ? x.id : '',
              type,
              prompt: typeof x.prompt === 'string' ? x.prompt : '',
              config:
                x.config && typeof x.config === 'object' && !Array.isArray(x.config)
                  ? (x.config as Record<string, unknown>)
                  : {},
              sourceCaptureIds: asStringArray(x.sourceCaptureIds),
              skillTargets: asStringArray(x.skillTargets),
            }
            return it
          })
          .filter((x) => x.id.length > 0)
      }
    } catch {
      items = []
    }
  }
  let sourceCaptureIds: string[] = []
  if (row.SourceCaptureIdsJson) {
    try {
      sourceCaptureIds = asStringArray(JSON.parse(row.SourceCaptureIdsJson) as unknown)
    } catch {
      sourceCaptureIds = []
    }
  }
  let clusterIds: string[] = []
  if (row.ClusterIdsJson) {
    try {
      clusterIds = asStringArray(JSON.parse(row.ClusterIdsJson) as unknown)
    } catch {
      clusterIds = []
    }
  }
  return {
    id: row.Id,
    userId: row.UserId,
    date: row.PackDate.toISOString().slice(0, 10),
    sourceCaptureIds,
    clusterIds,
    title: row.Title,
    subtitle: row.Subtitle,
    estimatedMinutes: row.EstimatedMinutes,
    level: row.Level,
    items,
    xpPotential: row.XpPotential,
    status,
    createdAt: row.CreatedAt.toISOString(),
    completedAt: row.CompletedAt ? row.CompletedAt.toISOString() : null,
  }
}

export function practicePackToPersistence(pack: PersonalizedPracticePack): {
  sourceCaptureIdsJson: string
  clusterIdsJson: string
  title: string
  subtitle: string
  estimatedMinutes: number
  level: string
  itemsJson: string
  xpPotential: number
  status: PersonalizedPracticePackStatus
  completedAt: Date | null
} {
  return {
    sourceCaptureIdsJson: JSON.stringify(pack.sourceCaptureIds),
    clusterIdsJson: JSON.stringify(pack.clusterIds),
    title: pack.title,
    subtitle: pack.subtitle,
    estimatedMinutes: pack.estimatedMinutes,
    level: pack.level,
    itemsJson: JSON.stringify(pack.items),
    xpPotential: pack.xpPotential,
    status: pack.status,
    completedAt: pack.completedAt ? new Date(pack.completedAt) : null,
  }
}
