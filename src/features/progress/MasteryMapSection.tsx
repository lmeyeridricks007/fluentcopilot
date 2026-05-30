import { Map } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { AbilityCard } from '@/features/progress/AbilityCard'
import { useMasteryMapViewModel } from '@/features/progress/useMasteryMapViewModel'

export function MasteryMapSection() {
  const vm = useMasteryMapViewModel()

  return (
    <section id="mastery-map" className="scroll-mt-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
          <Map className="w-5 h-5 text-primary-600" aria-hidden />
        </div>
        <div>
          <h2 className="text-body-lg font-semibold text-ink-primary">Real-life ability map</h2>
          <p className="text-caption text-ink-secondary mt-0.5 leading-snug">
            What you can do in Dutch — not abstract levels. Built from scenarios, drills, review, and your coach
            signals.
          </p>
        </div>
      </div>

      <Card variant="flat" padding="md" className="border border-primary-100 bg-primary-50/20">
        <p className="text-body-sm font-semibold text-primary-900">{vm.readiness.title}</p>
        <p className="text-caption text-ink-secondary mt-1 leading-relaxed">{vm.readiness.body}</p>
      </Card>

      <div className="space-y-6">
        {vm.groups.map((g) => (
          <div key={g.id}>
            <h3 className="text-caption font-semibold text-ink-secondary uppercase tracking-wide mb-2 px-0.5">
              {g.label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {g.abilities.map((a) => (
                <AbilityCard key={a.id} ability={a} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
