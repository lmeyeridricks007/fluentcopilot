export function resolveExamUserId(req: Request): string | null {
  const h = req.headers.get('x-user-id')?.trim()
  if (h) return h
  const q = new URL(req.url).searchParams.get('userId')?.trim()
  return q || null
}

export function resolveTimeZone(req: Request): string {
  return req.headers.get('x-time-zone')?.trim() || 'UTC'
}
