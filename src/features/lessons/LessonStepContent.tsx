import { Fragment, type ReactNode } from 'react'

export type ParsedSimpleTable = { headers: string[]; rows: string[][] }

function parseTableRow(line: string): string[] {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|')) return []
  const inner = trimmed.endsWith('|') ? trimmed.slice(1, -1) : trimmed.slice(1)
  return inner.split('|').map((c) => c.trim())
}

/** Separator row e.g. `| --- | --- |` */
function isMarkdownTableSeparatorRow(line: string): boolean {
  const cells = parseTableRow(line.trim())
  if (cells.length < 2) return false
  return cells.every((c) => /^:?-{2,}:?$/.test(c.replace(/\s/g, '')))
}

/**
 * GFM-style pipe tables only (header + separator + body rows).
 * Returns null if the block is not a table.
 */
export function tryParseMarkdownTable(block: string): ParsedSimpleTable | null {
  const lines = block
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0)
  if (lines.length < 3) return null

  const headerLine = lines[0].trim()
  const sepLine = lines[1].trim()
  if (!headerLine.startsWith('|') || !headerLine.endsWith('|')) return null
  if (!isMarkdownTableSeparatorRow(sepLine)) return null

  const headers = parseTableRow(headerLine)
  if (headers.length < 2) return null

  const rows: string[][] = []
  for (let i = 2; i < lines.length; i++) {
    const rowLine = lines[i].trim()
    if (!rowLine.startsWith('|')) return null
    const row = parseTableRow(rowLine)
    if (row.length === 0) continue
    const normalized =
      row.length >= headers.length
        ? row.slice(0, headers.length)
        : [...row, ...Array(headers.length - row.length).fill('')]
    rows.push(normalized)
  }

  if (rows.length === 0) return null
  return { headers, rows }
}

function LessonMarkdownTable({ table }: { table: ParsedSimpleTable }) {
  const { headers, rows } = table
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface-elevated shadow-sm">
      <table className="w-full min-w-[16rem] text-left text-body-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {headers.map((h, i) => (
              <th key={i} scope="col" className="px-3 py-2.5 font-semibold text-ink-primary align-top">
                {formatInlineBold(h, `th-${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-slate-100 last:border-b-0">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2.5 align-top text-ink-primary">
                  {formatInlineBold(cell, `td-${ri}-${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Renders `**bold**` segments and line breaks for lesson step copy (no full markdown). */
export function LessonStepContent({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/)
  return (
    <div className="space-y-4 text-body text-ink-primary">
      {paragraphs.map((para, pi) => {
        const table = tryParseMarkdownTable(para.trim())
        if (table) {
          return <LessonMarkdownTable key={pi} table={table} />
        }
        return (
          <p key={pi} className="whitespace-pre-line leading-relaxed">
            {formatInlineBold(para, `p-${pi}`)}
          </p>
        )
      })}
    </div>
  )
}

/** `**bold**` and single-asterisk `*italic*` (applied to segments outside bold). */
export function formatInlineBold(s: string, keyPrefix = 'fmt'): ReactNode[] {
  const boldParts = s.split(/(\*\*[^*]+\*\*)/g)
  return boldParts.flatMap((part, i): ReactNode[] => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return [
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-ink-primary">
          {part.slice(2, -2)}
        </strong>,
      ]
    }
    return formatItalicSegments(part, `${keyPrefix}-i-${i}`)
  })
}

function formatItalicSegments(s: string, keyPrefix: string): ReactNode[] {
  const parts = s.split(/(\*[^*]+\*)/g)
  return parts.map((part, j) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={`${keyPrefix}-${j}`} className="italic text-ink-primary">
          {part.slice(1, -1)}
        </em>
      )
    }
    return part ? <Fragment key={`${keyPrefix}-${j}`}>{part}</Fragment> : null
  }).filter(Boolean) as ReactNode[]
}
