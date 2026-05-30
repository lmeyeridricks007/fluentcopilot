'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Crown } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useProductEntitlements } from '@/features/entitlements/useProductEntitlements'
import { PRICING_HREF } from '@/lib/entitlements'

const FEATURES = [
  'Unlimited lessons (no daily cap)',
  'AI voice tutor & pronunciation feedback',
  'Full exam prep: training, simulations, practice exams',
  'Skill tracks & exam-style simulation in Practice',
  'Semi-guided & open conversation modes',
  'Deeper B1 readiness insights',
  'Daily reflection & location-aware phrases (when enabled)',
]

const PLANS = [
  { id: 'monthly', name: 'Monthly', price: '€9.99', period: '/month', popular: false },
  { id: 'yearly', name: 'Yearly', price: '€79', period: '/year', popular: true, save: 'Save 34%' },
]

/**
 * In-app Premium context: explains tiers for closed beta. No checkout — plan comes from the invite registry.
 */
export function PremiumUpsellPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { isPremiumPlan, planLabel } = useProductEntitlements()

  if (isPremiumPlan) {
    return (
      <div className="px-4 py-6 space-y-6 pb-24">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-3">
            <Crown className="w-8 h-8" aria-hidden />
          </div>
          <h1 className="text-title font-bold text-ink-primary">Your plan: Premium</h1>
          <p className="text-body-sm text-ink-secondary mt-1">
            Your closed-beta account includes the full product: exam prep, voice, skill tracks, and more.
          </p>
          {user?.email ? (
            <p className="text-caption text-ink-tertiary mt-2">{user.email}</p>
          ) : null}
        </div>
        <Card variant="outlined">
          <ul className="space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-body-sm text-ink-primary">
                <Check className="w-5 h-5 text-success shrink-0" aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Button variant="primary" fullWidth onClick={() => router.push('/app/talk')}>
          Back to Home
        </Button>
        <Button variant="ghost" fullWidth onClick={() => router.push('/app/settings')}>
          Settings
        </Button>
        <p className="text-caption text-ink-tertiary text-center">
          Billing is not live yet. Your tier is tied to your beta invitation today.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      <h1 className="text-title font-bold text-ink-primary text-center">Premium in this app</h1>
      <p className="text-body-sm text-ink-secondary text-center leading-relaxed">
        You&apos;re on <span className="font-semibold text-ink-primary">{planLabel}</span> for the beta. Premium unlocks
        full exam preparation, voice tutor, skill tracks, simulations, and deeper readiness detail — on top of lessons and
        guided scenarios you already have.
      </p>

      <Card variant="outlined" padding="md" className="border-amber-200/80 bg-amber-50/30">
        <CardTitle className="text-body-sm">Checkout isn&apos;t live</CardTitle>
        <CardDescription className="text-body-sm mt-1 leading-relaxed">
          See public pricing for what we intend to charge later. Your access during the beta follows your invite (Basic vs
          Premium).
        </CardDescription>
        <Link
          href={PRICING_HREF}
          className="mt-4 inline-flex w-full min-h-touch items-center justify-center font-medium rounded-lg transition-colors bg-primary-600 text-white hover:bg-primary-700 px-4 py-2.5 text-body"
        >
          View pricing
        </Link>
      </Card>

      <div className="space-y-3">
        <p className="text-caption font-semibold text-ink-secondary uppercase tracking-wide px-0.5">Planned prices</p>
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            variant="outlined"
            padding="md"
            className={plan.popular ? 'border-primary-500 bg-primary-50/50' : ''}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-body">{plan.name}</CardTitle>
                <p className="text-body font-bold text-ink-primary mt-0.5">
                  {plan.price}
                  <span className="text-body-sm font-normal text-ink-secondary">{plan.period}</span>
                </p>
                {plan.save ? <p className="text-caption text-success font-medium mt-1">{plan.save}</p> : null}
              </div>
              <span className="text-caption font-medium text-ink-tertiary shrink-0">Coming later</span>
            </div>
          </Card>
        ))}
      </div>

      <Card variant="outlined">
        <CardTitle className="text-body">Included with Premium</CardTitle>
        <ul className="mt-3 space-y-2">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-body-sm text-ink-primary">
              <Check className="w-5 h-5 text-success shrink-0" aria-hidden />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Button variant="primary" fullWidth onClick={() => router.push('/app/talk')}>
        Continue with Basic
      </Button>
      <Button variant="ghost" fullWidth onClick={() => router.push('/app/settings')}>
        Settings
      </Button>
    </div>
  )
}
