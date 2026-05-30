import type { BetaRequestEmailPayload, SupportEmailPayload } from './types'

function esc(v: string): string {
  return v
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function buildBetaRequestEmail(payload: BetaRequestEmailPayload): {
  subject: string
  text: string
  html: string
} {
  const subject = '[FluentCopilot] New beta request'
  const rows = [
    ['Email', payload.email],
    ['First name', payload.firstName || '—'],
    ['Source surface', payload.sourceSurface || '—'],
    ['Route', payload.route || '—'],
    ['IP', payload.ipAddress || '—'],
    ['User agent', payload.userAgent || '—'],
    ['Submitted at', payload.submittedAtIso],
  ]

  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n')
  const htmlRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px;font-weight:600;border:1px solid #e5e7eb;">${esc(k)}</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${esc(v)}</td></tr>`,
    )
    .join('')

  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.5"><h2 style="margin:0 0 12px">New FluentCopilot beta request</h2><table style="border-collapse:collapse;border:1px solid #e5e7eb">${htmlRows}</table></div>`
  return { subject, text, html }
}

export function buildSupportEmail(payload: SupportEmailPayload): {
  subject: string
  text: string
  html: string
} {
  const subject = `[FluentCopilot] New support request - ${payload.topic}`
  const text = [
    `Name: ${payload.name || '—'}`,
    `Email: ${payload.email}`,
    `Topic: ${payload.topic}`,
    `Message:\n${payload.message}`,
    `Source surface: ${payload.sourceSurface || '—'}`,
    `Route: ${payload.route || '—'}`,
    `IP: ${payload.ipAddress || '—'}`,
    `User agent: ${payload.userAgent || '—'}`,
    `Submitted at: ${payload.submittedAtIso}`,
  ].join('\n')

  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.5">
  <h2 style="margin:0 0 12px">New FluentCopilot support request</h2>
  <p><strong>Name:</strong> ${esc(payload.name || '—')}<br/>
  <strong>Email:</strong> ${esc(payload.email)}<br/>
  <strong>Topic:</strong> ${esc(payload.topic)}<br/>
  <strong>Source:</strong> ${esc(payload.sourceSurface || '—')}<br/>
  <strong>Route:</strong> ${esc(payload.route || '—')}<br/>
  <strong>IP:</strong> ${esc(payload.ipAddress || '—')}<br/>
  <strong>Submitted at:</strong> ${esc(payload.submittedAtIso)}</p>
  <p style="white-space:pre-wrap;border:1px solid #e5e7eb;border-radius:8px;padding:12px;background:#f9fafb">${esc(payload.message)}</p>
  </div>`
  return { subject, text, html }
}
