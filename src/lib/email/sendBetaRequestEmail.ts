import { getEmailConfig } from './emailConfig'
import { sendEmail } from './emailProvider'
import { buildBetaRequestEmail } from './emailTemplates'
import type { BetaRequestEmailPayload } from './types'

export async function sendBetaRequestEmail(payload: BetaRequestEmailPayload): Promise<{
  delivered: boolean
  detail?: string
}> {
  const cfg = getEmailConfig()
  if (!cfg.betaRequestToEmail) {
    console.warn('[beta-request] missing BETA_REQUEST_TO_EMAIL')
    return { delivered: false, detail: 'missing_to_email' }
  }

  const content = buildBetaRequestEmail(payload)
  const result = await sendEmail({
    to: cfg.betaRequestToEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
    replyTo: payload.email,
  })

  return { delivered: result.delivered, detail: result.detail }
}
