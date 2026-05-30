'use client'

import type { ReactNode } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'secondary'
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-primary/40 backdrop-blur-[2px]"
      role="presentation"
      onClick={onCancel}
    >
      <Card
        variant="elevated"
        padding="md"
        className="w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardTitle className="text-body-lg font-semibold text-ink-primary">{title}</CardTitle>
        <div className="text-body-sm text-ink-secondary mt-2 leading-relaxed space-y-2">{description}</div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
          <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'secondary' : confirmVariant}
            className={`flex-1 ${destructive ? 'border-error text-error hover:bg-error/10' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  )
}
