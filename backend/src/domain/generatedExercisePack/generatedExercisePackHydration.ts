import type { ExerciseBlock, ExerciseResult, GeneratedExercisePack, StoredExerciseBlock } from './generatedExercisePackTypes'
import { computeExercisePackProgress } from './generatedExercisePackTypes'

export type BlockResultRow = {
  blockId: string
  correctness: number | null
  completionScore: number | null
  userAnswerJson: string | null
  notesJson: string | null
  createdAt: string
}

function parseResultRow(r: BlockResultRow): ExerciseResult {
  let userAnswer: unknown
  if (r.userAnswerJson) {
    try {
      userAnswer = JSON.parse(r.userAnswerJson) as unknown
    } catch {
      userAnswer = r.userAnswerJson
    }
  }
  let notes: string[] | undefined
  if (r.notesJson) {
    try {
      const j = JSON.parse(r.notesJson) as unknown
      notes = Array.isArray(j) ? j.filter((x): x is string => typeof x === 'string') : undefined
    } catch {
      notes = undefined
    }
  }
  return {
    correctness: r.correctness == null ? undefined : Number(r.correctness),
    completionScore: r.completionScore == null ? undefined : Number(r.completionScore),
    userAnswer,
    notes,
    createdAt: r.createdAt,
  }
}

/** Merge persisted block results into stored block definitions. */
export function hydrateExerciseBlocks(
  definitions: readonly StoredExerciseBlock[],
  resultsByBlockId: ReadonlyMap<string, BlockResultRow>,
): ExerciseBlock[] {
  return definitions.map((def) => {
    const row = resultsByBlockId.get(def.id)
    const result = row ? parseResultRow(row) : undefined
    const completionState = result ? ('completed' as const) : ('not_started' as const)
    return { ...def, config: def.config, completionState, result } as ExerciseBlock
  })
}

export function hydrateGeneratedExercisePack(params: {
  id: string
  userId: string
  sourceCaptureIdsJson: string
  title: string
  subtitle: string | null
  estimatedMinutes: number
  level: string
  theme: string | null
  packType: string
  blocksJson: string
  status: string
  createdAt: string
  completedAt: string | null
  xpPotential: number
  xpAwarded: number | null
  totalBlocks: number
  completedBlocks: number
  lastOpenedAt: string | null
  lastCompletedBlockId: string | null
  results: BlockResultRow[]
}): GeneratedExercisePack {
  let sourceCaptureIds: string[] = []
  try {
    const j = JSON.parse(params.sourceCaptureIdsJson) as unknown
    sourceCaptureIds = Array.isArray(j) ? j.filter((x): x is string => typeof x === 'string') : []
  } catch {
    sourceCaptureIds = []
  }
  let definitions: StoredExerciseBlock[] = []
  try {
    const j = JSON.parse(params.blocksJson) as unknown
    definitions = Array.isArray(j) ? (j as StoredExerciseBlock[]) : []
  } catch {
    definitions = []
  }
  const map = new Map<string, BlockResultRow>()
  for (const r of params.results) {
    map.set(r.blockId, r)
  }
  const blocks = hydrateExerciseBlocks(definitions, map)
  const completedBlocks = blocks.filter((b) => b.completionState === 'completed').length
  const totalBlocks = params.totalBlocks > 0 ? params.totalBlocks : blocks.length
  const progress = computeExercisePackProgress({
    totalBlocks: totalBlocks,
    completedBlocks: Math.max(completedBlocks, params.completedBlocks),
    lastOpenedAt: params.lastOpenedAt ?? undefined,
    lastCompletedBlockId: params.lastCompletedBlockId ?? undefined,
  })
  return {
    id: params.id,
    userId: params.userId,
    sourceCaptureIds,
    title: params.title,
    subtitle: params.subtitle ?? '',
    estimatedMinutes: params.estimatedMinutes,
    level: (params.level as GeneratedExercisePack['level']) || 'mixed',
    theme: params.theme ?? '',
    packType: params.packType as GeneratedExercisePack['packType'],
    blocks,
    status: params.status as GeneratedExercisePack['status'],
    createdAt: params.createdAt,
    completedAt: params.completedAt ?? undefined,
    xpPotential: params.xpPotential,
    xpAwarded: params.xpAwarded ?? undefined,
    progress,
  }
}
