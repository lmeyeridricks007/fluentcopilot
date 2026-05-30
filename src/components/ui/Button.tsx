import { forwardRef } from 'react'
import { clsx } from 'clsx'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth,
      loading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        className={clsx(
          'relative inline-flex items-center justify-center gap-2 font-semibold touch-manipulation select-none',
          'transition-[color,background-color,transform,box-shadow,filter] duration-200 ease-out',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
          'disabled:opacity-50 disabled:pointer-events-none',
          {
            'w-full': fullWidth,
            // Sizes
            'min-h-touch px-5 py-2.5 text-body rounded-full': size === 'md',
            'min-h-touch px-4 py-2 text-body-sm rounded-full': size === 'sm',
            'min-h-touch px-7 py-3.5 text-body-lg rounded-full': size === 'lg',
            // Variants
            'text-white shadow-hero hover:brightness-[1.06] active:scale-[0.98] active:shadow-md bg-brand-gradient':
              variant === 'primary',
            'bg-surface-elevated text-ink-primary ring-1 ring-slate-200 hover:bg-surface-muted hover:ring-slate-300 active:bg-slate-100 active:scale-[0.99]':
              variant === 'secondary',
            'bg-transparent text-ink-primary hover:bg-surface-muted/80':
              variant === 'ghost',
            'bg-error/10 text-error hover:bg-error/20': variant === 'danger',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'
