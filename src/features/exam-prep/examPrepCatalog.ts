/**
 * Exam Prep — catalog of exam domains (aligned with `rubricDomainKey` + KMN).
 */
import type { LucideIcon } from 'lucide-react'
import { Mic, FileText, Headphones, BookOpen, Landmark } from 'lucide-react'

export type ExamPrepTypeId = 'speaking' | 'writing' | 'listening' | 'reading' | 'kmn'

export type ExamPrepTypeRow = {
  id: ExamPrepTypeId
  title: string
  /** Dutch label for exam surfaces (hero, cards, hub). */
  titleNl: string
  /** Short subtitle on cards */
  tagline: string
  /** Why it matters (1–2 lines) */
  whyItMatters: string
  icon: LucideIcon
  /** Future: not_started | training | simulation — placeholder for UI slots */
  statusSlot?: 'not_started' | 'in_progress' | 'strong'
}

export const EXAM_PREP_TYPE_IDS: ExamPrepTypeId[] = [
  'speaking',
  'writing',
  'listening',
  'reading',
  'kmn',
]

export const EXAM_PREP_TYPES: ExamPrepTypeRow[] = [
  {
    id: 'speaking',
    title: 'Speaking',
    titleNl: 'Spreken',
    tagline: 'Answer exam-style questions aloud',
    whyItMatters: 'Train clear answers under time pressure — the way oral exams expect.',
    icon: Mic,
  },
  {
    id: 'writing',
    title: 'Writing',
    titleNl: 'Schrijven',
    tagline: 'Forms, messages, short texts',
    whyItMatters: 'Structured writing tasks with rubric-style feedback, not free chat.',
    icon: FileText,
  },
  {
    id: 'listening',
    title: 'Listening',
    titleNl: 'Luisteren',
    tagline: 'Short spoken Dutch you must understand',
    whyItMatters: 'Gist and detail from announcements, dialogues, and everyday audio.',
    icon: Headphones,
  },
  {
    id: 'reading',
    title: 'Reading',
    titleNl: 'Lezen',
    tagline: 'Practical texts and questions',
    whyItMatters: 'Notices, ads, and short articles — find the right answer fast.',
    icon: BookOpen,
  },
  {
    id: 'kmn',
    title: 'KNM',
    titleNl: 'KNM',
    tagline: 'Dutch society & civic knowledge',
    whyItMatters: 'Knowledge for integration paths — institutions, norms, everyday life.',
    icon: Landmark,
  },
]

export function getExamPrepType(id: string): ExamPrepTypeRow | undefined {
  return EXAM_PREP_TYPES.find((t) => t.id === id)
}

export function isExamPrepTypeId(id: string): id is ExamPrepTypeId {
  return EXAM_PREP_TYPE_IDS.includes(id as ExamPrepTypeId)
}
