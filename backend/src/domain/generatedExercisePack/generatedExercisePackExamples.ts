/**
 * Example JSON for a capture_word pack (“gezellig”) — useful for fixtures and API docs.
 * Not loaded at runtime unless imported by tests.
 */
import type { GeneratedExercisePack } from './generatedExercisePackTypes'

export const EXAMPLE_CAPTURE_WORD_PACK: GeneratedExercisePack = {
  id: '00000000-0000-4000-8000-000000000001',
  userId: '00000000-0000-4000-8000-000000000099',
  sourceCaptureIds: ['00000000-0000-4000-8000-0000000000aa'],
  title: 'Pack: gezellig',
  subtitle: 'Warm-up → recognition → say it → short write',
  estimatedMinutes: 6,
  level: 'A2',
  theme: 'Social / mood',
  packType: 'capture_word',
  status: 'ready',
  createdAt: '2026-04-22T12:00:00.000Z',
  xpPotential: 45,
  progress: {
    totalBlocks: 5,
    completedBlocks: 0,
    completionPercent: 0,
  },
  blocks: [
    {
      id: 'b1',
      type: 'explanation_card',
      title: 'Your word',
      sourceCaptureIds: ['00000000-0000-4000-8000-0000000000aa'],
      skillTags: ['vocabulary', 'register'],
      estimatedSeconds: 60,
      completionState: 'not_started',
      config: {
        dutch: 'gezellig',
        englishMeaning: 'Cosy, convivial, pleasant company — a very common positive vibe.',
        shortUsageNote: 'Often describes people, evenings, cafés, homes — not “efficient”.',
        exampleLines: [
          { dutch: 'Het was erg gezellig gisteravond.', english: 'It was really nice last night.' },
          { dutch: 'Een gezellig café.', english: 'A cosy / friendly café.' },
        ],
      },
    },
    {
      id: 'b2',
      type: 'multiple_choice_meaning',
      instruction: 'Pick the gloss that fits everyday Dutch best.',
      sourceCaptureIds: ['00000000-0000-4000-8000-0000000000aa'],
      skillTags: ['vocabulary'],
      estimatedSeconds: 45,
      completionState: 'not_started',
      config: {
        prompt: 'Which meaning fits “gezellig” in conversation?',
        options: [
          { id: 'a', label: 'Cosy, friendly atmosphere / good company', isCorrect: true },
          { id: 'b', label: 'Strictly “efficient” or “fast”', isCorrect: false },
          { id: 'c', label: 'Only used for bad weather', isCorrect: false },
        ],
        correctExplanation: 'Dutch speakers use gezellig for people, places, and moments that feel warm and sociable.',
      },
    },
    {
      id: 'b3',
      type: 'hear_and_repeat',
      sourceCaptureIds: ['00000000-0000-4000-8000-0000000000aa'],
      skillTags: ['listening', 'speaking'],
      estimatedSeconds: 50,
      completionState: 'not_started',
      config: {
        targetText: 'Het was erg gezellig gisteravond.',
        hint: 'Let the rhythm stay relaxed.',
        repeatCount: 2,
      },
    },
    {
      id: 'b4',
      type: 'write_your_own_line',
      sourceCaptureIds: ['00000000-0000-4000-8000-0000000000aa'],
      skillTags: ['writing', 'production'],
      estimatedSeconds: 120,
      completionState: 'not_started',
      config: {
        prompt: 'Write one Dutch sentence using “gezellig” about your real day.',
        targetWordOrPhrase: 'gezellig',
        evaluationMode: 'llm',
        feedbackStyle: 'light',
        minChars: 8,
      },
    },
    {
      id: 'b5',
      type: 'reflection_check',
      title: 'Close the loop',
      sourceCaptureIds: ['00000000-0000-4000-8000-0000000000aa'],
      skillTags: ['metacognition'],
      estimatedSeconds: 30,
      completionState: 'not_started',
      config: {
        prompt: 'When will you try this word again — aloud or in chat?',
        affirmations: ['Small reuse beats perfect reuse.'],
      },
    },
  ],
}
