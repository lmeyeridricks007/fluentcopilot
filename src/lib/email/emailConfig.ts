type Provider = 'resend' | 'console'

export type EmailConfig = {
  provider: Provider
  resendApiKey?: string
  fromEmail: string
  supportToEmail?: string
  betaRequestToEmail?: string
}

export function getEmailConfig(): EmailConfig {
  const rawProvider = process.env.EMAIL_PROVIDER?.trim().toLowerCase()
  const provider: Provider = rawProvider === 'resend' ? 'resend' : 'console'

  return {
    provider,
    resendApiKey: process.env.RESEND_API_KEY?.trim(),
    fromEmail: process.env.FROM_EMAIL?.trim() || 'FluentCopilot <onboarding@resend.dev>',
    supportToEmail: process.env.SUPPORT_TO_EMAIL?.trim(),
    betaRequestToEmail:
      process.env.BETA_REQUEST_TO_EMAIL?.trim() || process.env.BETA_REQUEST_NOTIFY_EMAIL?.trim(),
  }
}
