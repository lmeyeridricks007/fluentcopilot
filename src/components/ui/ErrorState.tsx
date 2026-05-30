import { AlertCircle } from 'lucide-react'
import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center text-error mb-4">
        <AlertCircle className="w-8 h-8" aria-hidden />
      </div>
      <h3 className="text-body-lg font-semibold text-ink-primary">{title}</h3>
      <p className="mt-2 text-body-sm text-ink-secondary max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
