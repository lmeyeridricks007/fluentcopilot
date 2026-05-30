/**
 * Bottom nav + IA: “Exams” tab should stay active for all exam-facing app routes.
 *
 * Note: do not use `pathname.startsWith('/app/exam')` alone — `/app/exam-prep` would match incorrectly.
 */
export function pathnameMatchesExamsNav(pathname: string): boolean {
  if (pathname.startsWith('/app/exam-prep')) return true
  if (pathname === '/app/exam' || pathname.startsWith('/app/exam/')) return true
  return false
}
