'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { QuickCaptureSheet } from './QuickCaptureSheet'
import type { QuickCaptureActionId } from './quickCaptureTypes'

export type QuickCaptureOpenOptions = { initial?: QuickCaptureActionId }

type Ctx = {
  open: (opts?: QuickCaptureOpenOptions) => void
  close: () => void
  isOpen: boolean
}

const QuickCaptureContext = createContext<Ctx | null>(null)

export function QuickCaptureProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [initialAction, setInitialAction] = useState<QuickCaptureActionId | null>(null)

  const handleClose = useCallback(() => {
    setOpen(false)
    setInitialAction(null)
  }, [])

  const value = useMemo(
    () => ({
      open: (opts?: QuickCaptureOpenOptions) => {
        setInitialAction(opts?.initial ?? null)
        setOpen(true)
      },
      close: handleClose,
      isOpen: open,
    }),
    [open, handleClose]
  )

  return (
    <QuickCaptureContext.Provider value={value}>
      {children}
      <QuickCaptureSheet open={open} initialAction={initialAction} onClose={handleClose} />
    </QuickCaptureContext.Provider>
  )
}

export function useQuickCaptureOptional() {
  return useContext(QuickCaptureContext)
}
