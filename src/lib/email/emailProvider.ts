import { getEmailConfig } from './emailConfig'
import type { EmailSendInput, EmailSendResult } from './types'

async function sendViaResend(input: EmailSendInput): Promise<EmailSendResult> {
  const cfg = getEmailConfig()
  if (!cfg.resendApiKey) {
    return { ok: false, delivered: false, detail: 'missing_resend_api_key', provider: 'resend' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: cfg.fromEmail,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo,
    }),
  })

  if (!response.ok) {
    const reason = await response.text().catch(() => response.statusText)
    console.error('[email] resend failure', response.status, reason)
    return { ok: false, delivered: false, detail: 'provider_error', provider: 'resend' }
  }

  return { ok: true, delivered: true, provider: 'resend' }
}

function sendViaConsole(input: EmailSendInput): EmailSendResult {
  console.info('[email][console]', {
    to: input.to,
    subject: input.subject,
    replyTo: input.replyTo,
    text: input.text,
  })
  return { ok: true, delivered: false, detail: 'console_provider', provider: 'console' }
}

export async function sendEmail(input: EmailSendInput): Promise<EmailSendResult> {
  const cfg = getEmailConfig()
  if (cfg.provider === 'resend') {
    return sendViaResend(input)
  }
  return sendViaConsole(input)
}
