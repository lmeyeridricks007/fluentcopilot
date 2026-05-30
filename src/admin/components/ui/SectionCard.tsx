interface SectionCardProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function SectionCard({ title, children, className = '' }: SectionCardProps) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
        <h2 className="text-body font-semibold text-ink-primary">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}
