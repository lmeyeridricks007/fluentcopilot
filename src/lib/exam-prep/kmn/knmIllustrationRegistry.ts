import type { KnmA2ExamCategory } from '@/lib/exam-system/a2KnmExamBank'
import type { KnmSlideDeckIllustrationId } from './knmSlideDeckIllustrationTypes'
import { isKnmSlideDeckIllustrationId } from './knmSlideDeckIllustrationCatalog'

/** Animated SVG scene id — one per concrete exam scenario (not per facet combo). */
export type KnmIllustrationId =
  | KnmSlideDeckIllustrationId
  | `${KnmA2ExamCategory}_0`
  | `${KnmA2ExamCategory}_1`
  | `${KnmA2ExamCategory}_2`
  | `${KnmA2ExamCategory}_3`
  | 'voorbeeld_delta'
  | 'voorbeeld_un'
  | 'voorbeeld_amsterdam'
  | 'voorbeeld_wilhelmus'
  | 'voorbeeld_holocaust'
  | 'voorbeeld_koningsdag'
  | 'voorbeeld_tweede_kamer'
  | 'voorbeeld_stembus'
  | 'voorbeeld_rijksmuseum'
  | 'voorbeeld_cao'
  | 'voorbeeld_huisarts'
  | 'voorbeeld_belastingdienst'

export function knmIllustrationIdForVignette(cat: KnmA2ExamCategory, stemKind: number): KnmIllustrationId {
  return `${cat}_${stemKind % 4}` as KnmIllustrationId
}

export function isKnmIllustrationId(id: string): id is KnmIllustrationId {
  return isKnmSlideDeckIllustrationId(id) || /^[a-z_]+_\d$/.test(id) || id.startsWith('voorbeeld_')
}
