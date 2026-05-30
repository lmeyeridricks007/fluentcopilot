import { clsx } from 'clsx'

/**
 * Intentional bilingual pattern: primary learning line (often Dutch) + secondary translation (English UI).
 */
export function LearningLine({
  primary,
  translation,
  className,
}: {
  primary: string
  translation?: string
  className?: string
}) {
  return (
    <div className={clsx('space-y-1', className)}>
      <p className="text-body-sm font-medium text-ink-primary leading-snug">{primary}</p>
      {translation ? (
        <p className="text-caption text-ink-secondary leading-snug border-l-2 border-slate-200 pl-2">
          {translation}
        </p>
      ) : null}
    </div>
  )
}
