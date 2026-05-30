import { NextResponse } from 'next/server'
import { z } from 'zod'
import { deliverBetaRequestNotification } from '@/lib/waitlist/betaRequestDelivery'

const bodySchema = z.object({
  email: z.string().min(1).email(),
  firstName: z.string().max(80).optional(),
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

  // Quietly absorb obvious bot submissions.
  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return NextResponse.json({ ok: true, delivered: false, delivery_detail: 'accepted_honeypot' })
  }

  const ua = req.headers.get('user-agent')
  const ipAddress = getClientIp(req)
  const { delivered, detail } = await deliverBetaRequestNotification({
    email: sanitize(parsed.data.email).toLowerCase(),
    firstName: parsed.data.firstName ? sanitize(parsed.data.firstName) : undefined,
    sourceSurface: parsed.data.sourceSurface ? sanitize(parsed.data.sourceSurface) : undefined,
    route: parsed.data.route ? sanitize(parsed.data.route) : undefined,
    userAgent: ua,
    ipAddress,
  })

  return NextResponse.json({
    ok: true,
    delivered,
    /** Present when delivered is false — useful for ops; safe to ignore in UI */
    delivery_detail: detail,
  })
}
