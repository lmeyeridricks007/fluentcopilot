/**
 * FD-09 — phrase list in generated lesson.
 */

interface PhraseItem {
  dutch: string
  translation: string
}

interface GeneratedLessonPhraseListProps {
  phrases: PhraseItem[]
  title?: string
}

export function GeneratedLessonPhraseList({ phrases, title = 'Key phrases' }: GeneratedLessonPhraseListProps) {
  return (
    <section>
      <h2 className="text-body-lg font-semibold text-ink-primary mb-2">{title}</h2>
      <ul className="space-y-3 list-none p-0 m-0">
        {phrases.map((p, i) => (
          <li key={i} className="py-2 border-b border-slate-100 last:border-0">
            <p className="font-medium text-ink-primary">{p.dutch}</p>
            <p className="text-body-sm text-ink-secondary mt-0.5">{p.translation}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
