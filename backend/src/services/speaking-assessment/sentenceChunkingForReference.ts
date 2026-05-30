/**
 * Split a target line into short coaching chunks for chunked reference TTS.
 * Conservative: prefer commas/semicolons, then split long clauses (~2–4 words per chunk).
 * Not linguistic parsing — tuned for shadowing and natural pauses.
 */
export function chunkDutchReferenceForCoaching(text: string): string[] {
  const raw = text.replace(/\s+/g, ' ').trim()
  if (!raw) return []

  const withoutEdgePunct = raw.replace(/[?!.]+$/g, '').trim() || raw

  const commaParts = withoutEdgePunct
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const expanded: string[] = []
  for (const part of commaParts) {
    expanded.push(...subdivideClause(part))
  }

  const deduped = expanded.filter((c, i, a) => a.findIndex((x) => x.toLowerCase() === c.toLowerCase()) === i)
  return deduped.slice(0, 8)
}

function subdivideClause(clause: string): string[] {
  const words = clause.split(/\s+/).filter(Boolean)
  if (words.length <= 3) return [clause]
  if (words.length === 4) {
    return [`${words[0]} ${words[1]}`, `${words[2]} ${words[3]}`]
  }
  if (words.length <= 6) {
    const mid = Math.ceil(words.length / 2)
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
  }
  const out: string[] = []
  const step = 3
  for (let i = 0; i < words.length; i += step) {
    out.push(words.slice(i, i + step).join(' '))
  }
  return out
}
