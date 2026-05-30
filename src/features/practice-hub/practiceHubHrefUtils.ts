/**
 * Compare practice destinations so we don’t stack duplicate CTAs (continue vs next-best vs coach).
 */

export function practiceHubNormalizeHref(href: string): string {
  try {
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'https://app.placeholder'
    const u = new URL(href, base)
    return `${u.pathname}${u.search}`
  } catch {
    return href.split('#')[0] ?? href
  }
}

export function practiceHubHrefsDiffer(a: string, b: string): boolean {
  return practiceHubNormalizeHref(a) !== practiceHubNormalizeHref(b)
}
