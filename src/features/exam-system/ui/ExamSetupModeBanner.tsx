import { clsx } from 'clsx'

export function ExamSetupModeBanner(props: {
  mode: 'simulation' | 'training'
  title: string
  subtitle: string
}) {
  const { mode, title, subtitle } = props
  const isSim = mode === 'simulation'
  return (
    <div
      className={clsx(
        'rounded-2xl border px-4 py-4 mb-6 shadow-md',
        isSim
          ? 'border-violet-400/30 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 text-white shadow-slate-900/25 ring-1 ring-inset ring-white/10'
          : 'border-primary-400/35 bg-gradient-to-br from-primary-800 via-primary-900 to-slate-900 text-white shadow-primary-900/20 ring-1 ring-inset ring-white/10',
      )}
    >
      <p
        className={clsx(
          'text-[10px] font-bold uppercase tracking-[0.16em]',
          isSim ? 'text-violet-200/90' : 'text-primary-100/85',
        )}
      >
        {isSim ? 'Exam mode' : 'Practice mode'}
      </p>
      <p className="text-body-lg font-bold tracking-tight mt-0.5">{title}</p>
      <p className="text-caption text-white/85 mt-1.5 leading-relaxed">{subtitle}</p>
    </div>
  )
}
