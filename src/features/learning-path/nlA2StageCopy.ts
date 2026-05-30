import type { A2BandId } from '@/demo-data/curriculum/a2Catalog'

/** Product-facing stage names (manifest may still use legacy subtitles). */
export const NL_A2_STAGE_PRODUCT: Record<
  A2BandId,
  { title: string; description: string; grammarFocus: string }
> = {
  'A2.1': {
    title: 'Survival expansion',
    description:
      'Get comfortable stretching conversations — routines, plans, and everyday questions in the present.',
    grammarFocus: 'Present · zijn/hebben · question order',
  },
  'A2.2': {
    title: 'Independence',
    description:
      'Handle real tasks with less friction — errands, short narratives, and grounded opinions.',
    grammarFocus: 'Perfectum · modals · longer turns',
  },
  'A2.3': {
    title: 'Control & real-world use',
    description:
      'Move with confidence in formal moments and exams — register, nuance, and integration-ready patterns.',
    grammarFocus: 'Register · opinions · formal phrasing',
  },
}
