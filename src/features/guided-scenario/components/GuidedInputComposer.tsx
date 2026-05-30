export function GuidedInputComposer({
  value,
  onChange,
  placeholder,
  allowCustom,
  disabled,
  helperText,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  allowCustom: boolean
  disabled?: boolean
  helperText?: string
}) {
  if (!allowCustom) return null

  return (
    <div className="space-y-1.5">
      {helperText ? <p className="text-caption text-ink-secondary">{helperText}</p> : null}
      <label className="block min-w-0">
        <span className="sr-only">Your reply in Dutch</span>
        <textarea
          rows={2}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-none rounded-xl border border-slate-200 bg-surface-elevated px-3 py-2.5 text-body-sm text-ink-primary placeholder:text-ink-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
        />
      </label>
    </div>
  )
}
