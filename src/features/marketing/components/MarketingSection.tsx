import type { ReactNode } from 'react'
import { clsx } from 'clsx'

export function MarketingSection({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  id?: string
  eyebrow?: string
  title: string
  description?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={clsx('mx-auto max-w-6xl px-4 sm:px-5 py-16 sm:py-20', className)}>
      {eyebrow && (
        <p className="text-caption font-bold uppercase tracking-wide text-primary-800 mb-2">{eyebrow}</p>
      )}
      <h2 className="text-title sm:text-2xl font-bold text-ink-primary max-w-3xl">{title}</h2>
      {description && (
        <p className="mt-4 text-body-lg text-ink-secondary max-w-3xl leading-relaxed">{description}</p>
      )}
      {children != null && <div className="mt-12">{children}</div>}
    </section>
  )
}
