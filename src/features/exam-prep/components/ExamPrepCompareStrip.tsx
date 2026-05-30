/**
 * Clear product contrast — English UI chrome (learning lines stay Dutch in content).
 */
export function ExamPrepCompareStrip() {
  return (
    <section
      aria-label="Talk versus exam preparation"
      className="py-3.5 border-t border-slate-200/75 space-y-2.5"
    >
      <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wide">How this differs</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-body-sm">
        <p className="text-ink-secondary leading-snug">
          <span className="font-semibold text-primary-700">Talk</span> — real-life Dutch first: messaging, speaking,
          scenes, and coaching that remembers you.
        </p>
        <p className="text-ink-secondary leading-snug">
          <span className="font-semibold text-slate-700">Exam</span> — structured A2 / inburgering tasks, rubrics, timed
          simulations, and readiness scoring.
        </p>
      </div>
    </section>
  )
}
