/**
 * Guided practice steps use blocks that start with `**N — …**` (N = 1…99), separated by a blank line.
 */
const BLOCK_START = /(?=\n\n\*\*\d+\s*—)/

export function splitGuidedPracticeItems(text: string): string[] | null {
  const t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!t) return null
  const parts = t.split(BLOCK_START).map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return null
  if (!/^\*\*\d+\s*—/.test(parts[0])) return null
  return parts
}

export function isGuidedPracticeTitle(title: string): boolean {
  return title.trim().toLowerCase() === 'guided practice'
}
