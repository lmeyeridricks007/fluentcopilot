import { z } from 'zod'

export const SpeakingAssessHttpBodySchema = z
  .object({
    audioBase64: z.string().min(1).max(6_000_000),
    mimeType: z.string().min(6).max(120),
    locale: z.string().max(32).optional().nullable(),
    scenarioId: z.string().min(1).max(200),
    /** Optional human-readable scenario title for LLM grounding (defaults to scenarioId). */
    scenarioName: z.string().min(1).max(300).optional().nullable(),
    promptId: z.string().min(1).max(200),
    /** Gold / scenario line for coaching; required for reference Azure alignment. */
    expectedText: z.string().max(16_000).optional().nullable(),
    transcript: z.string().max(16_000).optional().nullable(),
    level: z.enum(['A1', 'A2', 'B1']),
    mode: z.enum(['reference', 'open_response']),
    includeReferenceAudio: z.boolean(),
    userClipDurationMs: z.number().int().min(0).max(600_000).optional().nullable(),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (b.mode === 'reference' && !(b.expectedText?.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'expectedText required for reference mode', path: ['expectedText'] })
    }
    if (b.mode === 'open_response' && !(b.transcript?.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'transcript required for open_response mode', path: ['transcript'] })
    }
  })

export type SpeakingAssessHttpBody = z.infer<typeof SpeakingAssessHttpBodySchema>

export const SpeakingReferenceAudioQuerySchema = z
  .object({
    text: z.string().min(1).max(2000),
    locale: z.string().max(32).optional(),
    speed: z.enum(['normal', 'slow', 'chunked']),
    voice: z.string().max(120).optional(),
  })
  .strict()

export type SpeakingReferenceAudioQuery = z.infer<typeof SpeakingReferenceAudioQuerySchema>
