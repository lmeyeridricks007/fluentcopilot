export const SUPPORT_TOPICS = [
  'Beta access',
  'Product question',
  'Account help',
  'Billing / pricing question',
  'Privacy / legal',
  'Other',
] as const

export type SupportTopic = (typeof SUPPORT_TOPICS)[number]

export type SupportRequestInput = {
  name?: string
  email: string
  topic: SupportTopic
  message: string
  sourceSurface: string
  route?: string
  website?: string
}

export type SupportRequestResult =
  | { ok: true; delivered: boolean }
  | { ok: false; error: 'network' | 'validation' | 'server' }

export async function submitSupportRequestClient(input: SupportRequestInput): Promise<SupportRequestResult> {
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (res.status === 422) return { ok: false, error: 'validation' }
    if (!res.ok) return { ok: false, error: 'server' }

    const data = (await res.json()) as { delivered?: boolean }
    return { ok: true, delivered: !!data.delivered }
  } catch {
    return { ok: false, error: 'network' }
  }
}
