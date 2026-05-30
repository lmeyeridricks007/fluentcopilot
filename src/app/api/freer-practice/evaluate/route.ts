import { NextResponse } from 'next/server'
import { z } from 'zod'
import { evaluateFreerPractice } from '@/lib/freerPracticeEvaluation'

export const runtime = 'nodejs'

const bodySchema = z.object({
  text: z.string().min(1).max(8000),
  mode: z.enum(['typed', 'spoken']),
  activityPrompt: z.string().max(25000).optional(),
  speechConfidence: z.number().min(0).max(1).optional(),
})

export async function POST(req: Request) {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const { text, mode, activityPrompt, speechConfidence } = parsed.data

  const result = evaluateFreerPractice({
    text,
    mode,
    activityPrompt: activityPrompt ?? '',
    speechConfidence,
  })

  return NextResponse.json({ ...result, engine: 'heuristic' as const })
}
