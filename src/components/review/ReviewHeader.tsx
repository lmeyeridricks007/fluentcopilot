'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'

export function ReviewHeader({
  title,
  subtitle,
  onBack,
  className,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  className?: string
}) {
  return (
    <header className={clsx('flex items-start gap-2', className)}>
      {onBack ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 -ml-2 mt-0.5"
          onClick={onBack}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden />
        </Button>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="text-title-sm font-bold text-ink-primary leading-tight">{title}</h1>
        {subtitle ? <p className="text-body-sm text-ink-secondary mt-0.5">{subtitle}</p> : null}
      </div>
    </header>
  )
}
