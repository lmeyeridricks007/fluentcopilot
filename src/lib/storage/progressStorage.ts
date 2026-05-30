import { loadRetentionProfileSync } from '@/lib/retention/persistence'
import { removeLegacyProgressKey } from './storageMigrations'
import { safeGetItem, safeSetItem, safeWriteJson } from './safeStorage'
import {
  abilityMasteryStorageKeys,
  legacyProgressRootStorageKey,
  missionStorageKeys,
  retentionProfileStorageKey,
  reviewStorageKeys,
  SCHEMA_MISTAKES_KEY_PREFIX,
  userProgressManifestStorageKey,
} from './storageKeys'
import { progressManifestV1Schema } from './storageSchemas'
import {
  PROGRESS_MANIFEST_SCHEMA_VERSION,
  type ProgressDomainsRegistryV1,
  type ProgressManifestV1,
} from './storageTypes'

function nowIso(): string {
  return new Date().toISOString()
}

export function buildProgressDomainsRegistry(userId: string): ProgressDomainsRegistryV1 {
  return {
    retentionProfile: retentionProfileStorageKey(userId),
    reviewBank: reviewStorageKeys.bank(userId),
    reviewSrs: reviewStorageKeys.srs(userId),
    reviewMistakes: reviewStorageKeys.mistakes(userId),
    reviewMastery: reviewStorageKeys.mastery(userId),
    abilityMastery: abilityMasteryStorageKeys.forUser(userId),
    missionRuntime: missionStorageKeys.runtimeForUser(userId),
    schemaMistakesPattern: `${SCHEMA_MISTAKES_KEY_PREFIX}<retentionUserId>`,
  }
}

function parseLenientProgress(raw: unknown, userId: string): ProgressManifestV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.schemaVersion !== PROGRESS_MANIFEST_SCHEMA_VERSION) return null
  if (o.userId !== userId) return null

  const createdAt =
    typeof o.createdAt === 'string'
      ? o.createdAt
      : typeof o.initializedAt === 'string'
        ? o.initializedAt
        : nowIso()
  const updatedAt = typeof o.updatedAt === 'string' ? o.updatedAt : nowIso()

  let domains: ProgressDomainsRegistryV1
  if (o.domains && typeof o.domains === 'object') {
    const d = o.domains as Record<string, unknown>
    const base = buildProgressDomainsRegistry(userId)
    domains = {
      retentionProfile: typeof d.retentionProfile === 'string' ? d.retentionProfile : base.retentionProfile,
      reviewBank: typeof d.reviewBank === 'string' ? d.reviewBank : base.reviewBank,
      reviewSrs: typeof d.reviewSrs === 'string' ? d.reviewSrs : base.reviewSrs,
      reviewMistakes: typeof d.reviewMistakes === 'string' ? d.reviewMistakes : base.reviewMistakes,
      reviewMastery: typeof d.reviewMastery === 'string' ? d.reviewMastery : base.reviewMastery,
      abilityMastery: typeof d.abilityMastery === 'string' ? d.abilityMastery : base.abilityMastery,
      missionRuntime: typeof d.missionRuntime === 'string' ? d.missionRuntime : base.missionRuntime,
      schemaMistakesPattern:
        typeof d.schemaMistakesPattern === 'string' ? d.schemaMistakesPattern : base.schemaMistakesPattern,
    }
  } else {
    domains = buildProgressDomainsRegistry(userId)
  }

  return {
    schemaVersion: PROGRESS_MANIFEST_SCHEMA_VERSION,
    userId,
    createdAt,
    updatedAt,
    domains,
    syncMeta:
      o.syncMeta && typeof o.syncMeta === 'object'
        ? (o.syncMeta as ProgressManifestV1['syncMeta'])
        : undefined,
  }
}

function readRawProgressJson(userId: string): { key: string; raw: string } | null {
  const canonical = userProgressManifestStorageKey(userId)
  const c = safeGetItem(canonical)
  if (c) return { key: canonical, raw: c }
  const leg = safeGetItem(legacyProgressRootStorageKey(userId))
  if (leg) return { key: legacyProgressRootStorageKey(userId), raw: leg }
  return null
}

export function userProgressKey(userId: string): string {
  return userProgressManifestStorageKey(userId)
}

/** @deprecated Use `userProgressManifestStorageKey` — kept for bootstrap barrel compatibility. */
export const progressRootStorageKey = userProgressManifestStorageKey

export function getUserProgress(userId: string): ProgressManifestV1 | null {
  const hit = readRawProgressJson(userId)
  if (!hit) return null
  try {
    const json = JSON.parse(hit.raw) as unknown
    const zr = progressManifestV1Schema.safeParse(json)
    let doc: ProgressManifestV1 | null = null
    if (zr.success && zr.data.userId === userId) {
      doc = zr.data as ProgressManifestV1
    } else {
      doc = parseLenientProgress(json, userId)
    }
    if (!doc) return null

    const isCanonical = hit.key === userProgressManifestStorageKey(userId)
    const needsWrite = !isCanonical || !zr.success
    if (needsWrite) {
      setUserProgress(doc)
    }
    return doc
  } catch {
    return null
  }
}

export function setUserProgress(manifest: ProgressManifestV1): void {
  const next: ProgressManifestV1 = {
    ...manifest,
    updatedAt: nowIso(),
    domains: manifest.domains ?? buildProgressDomainsRegistry(manifest.userId),
  }
  safeWriteJson(userProgressManifestStorageKey(next.userId), next)
  removeLegacyProgressKey(next.userId)
}

export function loadOrInitializeProgressForUser(userId: string): {
  root: ProgressManifestV1
  wasCreated: boolean
  recovery: boolean
} {
  if (typeof window !== 'undefined') {
    const existing = getUserProgress(userId)
    if (existing) {
      loadRetentionProfileSync(userId)
      return { root: existing, wasCreated: false, recovery: false }
    }

    const hadRaw =
      !!safeGetItem(userProgressManifestStorageKey(userId)) ||
      !!safeGetItem(legacyProgressRootStorageKey(userId))
    const recovery = hadRaw

    const t = nowIso()
    const root: ProgressManifestV1 = {
      schemaVersion: PROGRESS_MANIFEST_SCHEMA_VERSION,
      userId,
      createdAt: t,
      updatedAt: t,
      domains: buildProgressDomainsRegistry(userId),
    }
    const persisted = safeSetItem(userProgressManifestStorageKey(userId), JSON.stringify(root))
    removeLegacyProgressKey(userId)
    loadRetentionProfileSync(userId)
    return { root, wasCreated: persisted, recovery }
  }

  const t = nowIso()
  return {
    root: {
      schemaVersion: PROGRESS_MANIFEST_SCHEMA_VERSION,
      userId,
      createdAt: t,
      updatedAt: t,
      domains: buildProgressDomainsRegistry(userId),
    },
    wasCreated: true,
    recovery: false,
  }
}
