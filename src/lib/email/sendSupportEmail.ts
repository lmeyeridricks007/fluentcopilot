import { getEmailConfig } from './emailConfig'
import { sendEmail } from './emailProvider'
import { buildSupportEmail } from './emailTemplates'
import type { SupportEmailPayload } from './types'

export async function sendSupportEmail(payload: SupportEmailPayload): Promise<{
  delivered: boolean
  detail?: string
}> {
  const cfg = getEmailConfig()
  if (!cfg.supportToEmail) {
    console.warn('[contact] missing SUPPORT_TO_EMAIL')
    return { delivered: false, detail: 'missing_to_email' }
  }

  const content = buildSupportEmail(payload)
  const result = await sendEmail({
    to: cfg.supportToEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
    replyTo: payload.email,
  })

  return { delivered: result.delivered, detail: result.detail }
}
