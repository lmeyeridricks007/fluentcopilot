import { z } from 'zod'

/** Validates nested routine blob when reading untrusted JSON. */
export const routinePreferencesV1Schema = z
  .object({
    studyRhythmId: z.string().min(1),
    dailyMinutesCommitted: z.number().finite().nonnegative().optional(),
  })
  .strict()
