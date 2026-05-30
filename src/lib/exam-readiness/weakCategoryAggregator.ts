/**
 * Top 1–3 weak categories from attempts + weak-tag store (exam-prefixed).
 */
import type { ExamPrepTypeId } from '@/features/exam-prep/examPrepCatalog'
import type { A2WeakTagCount } from '@/features/curriculum/a2ReviewStore'
import type { ExamReadinessAttemptRecord } from '@/lib/exam-readiness/types'

const SPEAKING_KEY_LABELS: Record<string, { nl: string; en: string }> = {
  execution: { nl: 'Uitvoering van de opdracht', en: 'Task execution' },
  grammar: { nl: 'Grammatica', en: 'Grammar' },
  vocabulary: { nl: 'Woordenschat', en: 'Vocabulary' },
  fluency: { nl: 'Vloeiendheid', en: 'Fluency' },
  clearness: { nl: 'Structuur en duidelijkheid', en: 'Structure / clarity' },
  pronunciation: { nl: 'Uitspraak / verstaanbaarheid', en: 'Pronunciation' },
}

const WRITING_KEY_LABELS: Record<string, { nl: string; en: string }> = {
  execution: { nl: 'Opdracht volledig uitvoeren', en: 'Task execution' },
  task_execution: { nl: 'Opdracht volledig uitvoeren', en: 'Task execution' },
  grammar: { nl: 'Grammatica', en: 'Grammar' },
  spelling: { nl: 'Spelling', en: 'Spelling' },
  clearness: { nl: 'Opbouw van de tekst', en: 'Text structure' },
  vocabulary: { nl: 'Woordenschat', en: 'Vocabulary' },
}

function tagMatchesModule(tag: string, module: ExamPrepTypeId): boolean {
  const t = tag.toLowerCase()
  if (module === 'speaking') return t.includes('speaking') || t.includes('exam-speaking')
  if (module === 'writing') return t.includes('writing') || t.includes('exam-writing')
  if (module === 'listening') return t.includes('listening') || t.includes('exam-listening')
  if (module === 'reading') return t.includes('reading') || t.includes('exam-reading')
  if (module === 'kmn') return t.startsWith('kmn-') || t.includes('exam-kmn')
  return false
}

function weakTagToLabel(tag: string, module: ExamPrepTypeId): { key: string; labelNl: string; labelEn: string } | null {
  const t = tag.toLowerCase()
  if (module === 'listening') {
    if (t.includes('gist')) return { key: 'gist', labelNl: 'Luisteren: hoofdidee', labelEn: 'Listening: gist' }
    if (t.includes('detail')) return { key: 'detail', labelNl: 'Luisteren: details', labelEn: 'Listening: detail' }
    if (t.includes('intent')) return { key: 'intent', labelNl: 'Luisteren: bedoeling', labelEn: 'Listening: intent' }
    if (t.includes('replay')) return { key: 'replay', labelNl: 'Veel herhalen nodig', labelEn: 'Heavy replay use' }
    return { key: tag, labelNl: 'Luisteren', labelEn: 'Listening' }
  }
  if (module === 'reading') {
    if (t.includes('scanning')) return { key: 'scanning', labelNl: 'Snelle tekstscan', labelEn: 'Scanning' }
    if (t.includes('comprehension')) return { key: 'comprehension', labelNl: 'Begrijpend lezen', labelEn: 'Comprehension' }
    return { key: tag, labelNl: 'Lezen', labelEn: 'Reading' }
  }
  if (module === 'kmn') {
    if (t.includes('health')) return { key: 'kmn-health', labelNl: 'KNM: gezondheid', labelEn: 'KNM: healthcare' }
    if (t.includes('government')) return { key: 'kmn-gov', labelNl: 'KNM: overheid', labelEn: 'KNM: government' }
    if (t.includes('work')) return { key: 'kmn-work', labelNl: 'KNM: werk', labelEn: 'KNM: work' }
    if (t.includes('culture')) return { key: 'kmn-culture', labelNl: 'KNM: cultuur', labelEn: 'KNM: culture' }
    return { key: tag, labelNl: 'KNM-onderwerp', labelEn: 'KNM topic' }
  }
  return null
}

export function aggregateWeakCategoriesForModule(
  module: ExamPrepTypeId,
  attempts: ExamReadinessAttemptRecord[],
  weakTags: A2WeakTagCount[],
  max = 3
): { key: string; labelNl: string; labelEn: string }[] {
  const freq = new Map<string, { nl: string; en: string; w: number }>()

  for (const a of attempts.slice(0, 12)) {
    for (const k of a.weakRubricKeys) {
      const labels =
        module === 'speaking'
          ? SPEAKING_KEY_LABELS[k]
          : module === 'writing'
            ? WRITING_KEY_LABELS[k]
            : { nl: k, en: k }
      const row = freq.get(k) ?? { nl: labels?.nl ?? k, en: labels?.en ?? k, w: 0 }
      row.w += 2
      freq.set(k, row)
    }
  }

  for (const { tag, wrongCount } of weakTags) {
    if (!tagMatchesModule(tag, module)) continue
    const mapped = weakTagToLabel(tag, module)
    if (mapped) {
      const row = freq.get(mapped.key) ?? { nl: mapped.labelNl, en: mapped.labelEn, w: 0 }
      row.w += wrongCount
      freq.set(mapped.key, row)
    }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1].w - a[1].w)
    .slice(0, max)
    .map(([key, v]) => ({ key, labelNl: v.nl, labelEn: v.en }))
}
