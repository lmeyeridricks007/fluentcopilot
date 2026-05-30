export type EmailSendInput = {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}

export type EmailSendResult = {
  ok: boolean
  delivered: boolean
  detail?: string
  provider: 'resend' | 'console'
}

export type BetaRequestEmailPayload = {
  email: string
  firstName?: string
  sourceSurface?: string
  route?: string
  userAgent?: string | null
  ipAddress?: string | null
  submittedAtIso: string
}

export type SupportEmailPayload = {
  email: string
  name?: string
  topic: 'Beta access' | 'Product question' | 'Account help' | 'Billing / pricing question' | 'Privacy / legal' | 'Other'
  message: string
  sourceSurface?: string
  route?: string
  userAgent?: string | null
  ipAddress?: string | null
  submittedAtIso: string
}
