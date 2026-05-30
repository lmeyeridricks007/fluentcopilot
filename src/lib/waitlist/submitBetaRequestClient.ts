export type BetaRequestInput = {
  email: string
  firstName?: string
  sourceSurface: string
  route?: string
  website?: string
}

export type BetaRequestResult =
  | { ok: true; delivered: boolean }
  | { ok: false; error: 'network' | 'validation' | 'server' }

/**
 * Submits a beta access request from the browser. Never uses mailto.
 */
export async function submitBetaRequestClient(input: BetaRequestInput): Promise<BetaRequestResult> {
  try {
    const res = await fetch('/api/beta-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: input.email,
        firstName: input.firstName,
        sourceSurface: input.sourceSurface,
        route: input.route,
        website: input.website,
      }),
    })

    if (res.status === 422) {
      return { ok: false, error: 'validation' }
    }

    if (!res.ok) {
      return { ok: false, error: 'server' }
    }

    const data = (await res.json()) as { ok?: boolean; delivered?: boolean }
    return { ok: true, delivered: !!data.delivered }
  } catch {
    return { ok: false, error: 'network' }
  }
}
