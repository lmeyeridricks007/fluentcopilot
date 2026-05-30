import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendSupportEmail } from '@/lib/email/sendSupportEmail'
import type { SupportEmailPayload } from '@/lib/email/types'

const SUPPORT_TOPICS = [
  'Beta access',
  'Product question',
  'Account help',
  'Billing / pricing question',
  'Privacy / legal',
  'Other',
] as const

const bodySchema = z.object({
  name: z.string().max(80).optional(),
  email: z.string().min(1).email(),
  topic: z.enum(SUPPORT_TOPICS),
  message: z.string().min(10).max(4000),
  sourceSurface: z.string().max(120).optional(),
  route: z.string().max(200).optional(),
  website: z.string().max(200).optional(), // honeypot
})

function sanitize(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim()
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = req.headers.get('x-real-ip')?.trim()
  return forwarded || realIp || null
}

export async function POST(req: Request) {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'validation_error' }, { status: 422 })
  }

  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return NextResponse.json({ ok: true, delivered: false, delivery_detail: 'accepted_honeypot' })
  }

  const payload: SupportEmailPayload = {
    email: sanitize(parsed.data.email).toLowerCase(),
    name: parsed.data.name ? sanitize(parsed.data.name) : undefined,
    topic: parsed.data.topic,
    message: sanitize(parsed.data.message),
    sourceSurface: parsed.data.sourceSurface ? sanitize(parsed.data.sourceSurface) : undefined,
    route: parsed.data.route ? sanitize(parsed.data.route) : undefined,
    userAgent: req.headers.get('user-agent'),
    ipAddress: getClientIp(req),
    submittedAtIso: new Date().toISOString(),
  }

  const { delivered, detail } = await sendSupportEmail(payload)
  return NextResponse.json({ ok: true, delivered, delivery_detail: detail })
}
