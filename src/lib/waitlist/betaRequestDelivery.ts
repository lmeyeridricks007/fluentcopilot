/**
 * Server-only: notifies the product owner when someone requests beta access.
 * Wire Resend (or swap body) by setting env vars — see docs/product/public-site-conversion-refresh.md
 */
import { sendBetaRequestEmail } from '@/lib/email/sendBetaRequestEmail'

export type BetaRequestPayload = {
  email: string
  firstName?: string
  sourceSurface?: string
  route?: string
  userAgent?: string | null
  ipAddress?: string | null
}

function formatEmailText(p: BetaRequestPayload): string {
  const lines = [
    'New closed-beta access request (FluentCopilot)',
    '',
    `Email: ${p.email}`,
    p.firstName ? `First name: ${p.firstName}` : '',
    p.sourceSurface ? `Source: ${p.sourceSurface}` : '',
    p.route ? `Route: ${p.route}` : '',
    p.userAgent ? `User-Agent: ${p.userAgent}` : '',
    p.ipAddress ? `IP: ${p.ipAddress}` : '',
    '',
    `Time (server): ${new Date().toISOString()}`,
  ].filter(Boolean)
  return lines.join('\n')
}

/**
 * Returns whether the notification was handed off to an external provider.
 * When false, the request was accepted but only logged — configure Resend for real delivery.
 */
export async function deliverBetaRequestNotification(
  payload: BetaRequestPayload,
): Promise<{ delivered: boolean; detail?: string }> {
  const fallbackText = formatEmailText(payload)
  const result = await sendBetaRequestEmail({
    email: payload.email,
    firstName: payload.firstName,
    sourceSurface: payload.sourceSurface,
    route: payload.route,
    userAgent: payload.userAgent,
    ipAddress: payload.ipAddress,
    submittedAtIso: new Date().toISOString(),
  })
  if (!result.delivered) {
    console.warn('[beta-request] request accepted but not delivered', {
      detail: result.detail,
      fallback: fallbackText,
    })
  }
  return result
}
