/**
 * Public marketing / beta access — server notification via `/api/beta-request`
 * (Resend or webhook). See docs/product/public-site-conversion-refresh.md.
 *
 * Server env (never NEXT_PUBLIC for notify address):
 * - BETA_REQUEST_NOTIFY_EMAIL — inbox that receives beta requests
 * - RESEND_API_KEY — send through Resend
 * - BETA_REQUEST_FROM_EMAIL — optional verified sender
 * - BETA_REQUEST_WEBHOOK_URL — optional alternative to Resend (POST JSON)
 */

export const BETA_REQUEST_SECTION_ID = 'request'
