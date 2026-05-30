import { Check } from 'lucide-react'
import { clsx } from 'clsx'

export function FeatureCheckList({
  items,
  className,
}: {
  items: string[]
  className?: string
}) {
  return (
    <ul className={clsx('space-y-2.5', className)}>
      {items.map((f) => (
        <li key={f} className="flex gap-2.5 text-body-sm text-ink-secondary">
          <Check className="h-5 w-5 text-primary-700 shrink-0 mt-0.5" aria-hidden />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  )
}
