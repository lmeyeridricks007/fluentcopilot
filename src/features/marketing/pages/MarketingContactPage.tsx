'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { z } from 'zod'
import { BetaRequestForm } from '../components/BetaRequestForm'
import { SUPPORT_TOPICS, submitSupportRequestClient, type SupportTopic } from '@/lib/contact/submitSupportRequestClient'
import {
  trackContactFormFailed,
  trackContactFormSubmitted,
  trackContactFormSucceeded,
  trackContactFormViewed,
} from '@/lib/analytics'

const formSchema = z.object({
  name: z.string().max(80).optional(),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  topic: z.enum(SUPPORT_TOPICS, { errorMap: () => ({ message: 'Select a topic' }) }),
  message: z.string().min(10, 'Please add a bit more detail (at least 10 characters)'),
})

const ROUTING_CARDS: ReadonlyArray<{
  title: string
  description: string
  topic?: SupportTopic
  href?: string
  cta: string
}> = [
  {
    title: 'Beta access',
    description: 'Need an invite or want to check your request status?',
    topic: 'Beta access',
    cta: 'Ask about beta access',
  },
  {
    title: 'Product help',
    description: 'Questions about how the app works or what each plan includes?',
    topic: 'Product question',
    cta: 'Ask a product question',
  },
  {
    title: 'Account support',
    description: 'Already invited but having trouble signing in or accessing your account?',
    topic: 'Account help',
    cta: 'Get account help',
  },
  {
    title: 'Privacy / legal',
    description: 'Need data, privacy, terms, or cookie policy help?',
    href: '/privacy',
    cta: 'Go to privacy details',
  },
]

export function MarketingContactPage() {
  const pathname = usePathname() ?? ''
  const formRootRef = useRef<HTMLDivElement>(null)
  const viewedRef = useRef(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState<SupportTopic>('Product question')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; topic?: string; message?: string; name?: string }>({})
  const [errorMessage, setErrorMessage] = useState<string | undefined>()

  useEffect(() => {
    const el = formRootRef.current
    if (!el || viewedRef.current) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !viewedRef.current) {
          viewedRef.current = true
          trackContactFormViewed({ source_surface: 'contact_page_support_form', route: pathname || undefined })
        }
      },
      { threshold: 0.25 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [pathname])

  const formSummary = useMemo(() => {
    if (!submitted) return null
    return "Thanks — we've received your FluentCopilot support message and will follow up by email."
  }, [submitted])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    setErrorMessage(undefined)
    setLoading(true)

    const parsed = formSchema.safeParse({
      name: name.trim() || undefined,
      email: email.trim(),
      topic,
      message: message.trim(),
    })

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      setErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        topic: fieldErrors.topic?.[0],
        message: fieldErrors.message?.[0],
      })
      trackContactFormFailed({
        source_surface: 'contact_page_support_form',
        route: pathname || undefined,
        topic,
        reason: 'validation',
      })
      setLoading(false)
      return
    }

    trackContactFormSubmitted({
      source_surface: 'contact_page_support_form',
      route: pathname || undefined,
      topic,
    })

    const result = await submitSupportRequestClient({
      name: parsed.data.name,
      email: parsed.data.email,
      topic: parsed.data.topic,
      message: parsed.data.message,
      sourceSurface: 'contact_page_support_form',
      route: pathname || undefined,
      website,
    })

    setLoading(false)
    if (!result.ok) {
      trackContactFormFailed({
        source_surface: 'contact_page_support_form',
        route: pathname || undefined,
        topic,
        reason: result.error,
      })
      setErrorMessage(
        result.error === 'network'
          ? "We couldn't send your request right now. Check your connection and try again."
          : 'Something went wrong. Please try again.',
      )
      return
    }

    trackContactFormSucceeded({
      source_surface: 'contact_page_support_form',
      route: pathname || undefined,
      topic,
      delivered: result.delivered,
    })
    setSubmitted(true)
  }

  function chooseTopic(nextTopic: SupportTopic) {
    setTopic(nextTopic)
    document.getElementById('support-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-5 py-12 sm:py-16">
      <header>
        <p className="text-caption font-bold uppercase tracking-wide text-primary-800">Contact</p>
        <h1 className="mt-3 text-display sm:text-4xl font-bold text-ink-primary">Contact &amp; support</h1>
        <p className="mt-4 max-w-3xl text-body-lg text-ink-secondary leading-relaxed">
          Questions about beta access, the product, or your account? We&apos;ll point you in the right direction.
        </p>
      </header>

      <section className="mt-8">
        <Card variant="outlined" padding="lg" className="border-primary-200 bg-primary-50/50">
          <h2 className="text-title font-bold text-ink-primary">Not invited yet?</h2>
          <p className="mt-2 text-body text-ink-secondary leading-relaxed">
            Request beta access here. If you already have an invite and need sign-in help, use the support form below.
          </p>
          <div className="mt-4 max-w-xl">
            <BetaRequestForm sourceSurface="contact_page_access_block" variant="compact" showFirstName />
          </div>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="text-title font-bold text-ink-primary">What do you need help with?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {ROUTING_CARDS.map((card) => (
            <Card key={card.title} variant="outlined" padding="md">
              <h3 className="font-semibold text-ink-primary">{card.title}</h3>
              <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">{card.description}</p>
              {card.topic ? (
                <button
                  type="button"
                  className="mt-4 text-body-sm font-semibold text-primary-900 hover:text-primary-950"
                  onClick={() => {
                    if (card.topic) chooseTopic(card.topic)
                  }}
                >
                  {card.cta}
                </button>
              ) : (
                <Link href={card.href ?? '/privacy'} className="mt-4 inline-block text-body-sm font-semibold text-primary-900 hover:text-primary-950">
                  {card.cta}
                </Link>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section id="support-form" className="mt-10 scroll-mt-24" ref={formRootRef}>
        <Card variant="elevated" padding="lg" className="border border-slate-200">
          <h2 className="text-title font-bold text-ink-primary">Send a support message</h2>
          <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
            Already invited but having trouble signing in? Tell us what happened. Have a plan question? We can help
            you choose between Free, Core, and Premium.
          </p>

          {formSummary ? (
            <div className="mt-6 rounded-lg border border-primary-200 bg-primary-50/80 p-4">
              <p className="text-body-sm font-semibold text-ink-primary">{formSummary}</p>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
              <input
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="hidden"
                aria-hidden
                name="website"
              />
              <Input
                label="Name (optional)"
                autoComplete="name"
                placeholder="Alex"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
              />
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />
              <div>
                <label htmlFor="contact-topic" className="block text-body-sm font-medium text-ink-primary mb-1">
                  Topic
                </label>
                <select
                  id="contact-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value as SupportTopic)}
                  className="w-full min-h-touch px-3 rounded-lg border border-slate-300 bg-surface-elevated text-ink-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  aria-invalid={!!errors.topic}
                >
                  {SUPPORT_TOPICS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.topic && (
                  <p className="mt-1 text-body-sm text-error" role="alert">
                    {errors.topic}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-body-sm font-medium text-ink-primary mb-1">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help?"
                  className="w-full rounded-lg border border-slate-300 bg-surface-elevated px-3 py-2.5 text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  aria-invalid={!!errors.message}
                />
                {errors.message && (
                  <p className="mt-1 text-body-sm text-error" role="alert">
                    {errors.message}
                  </p>
                )}
              </div>
              <Button type="submit" size="lg" loading={loading}>
                Send message
              </Button>
              {errorMessage && (
                <p className="text-body-sm text-error" role="alert">
                  {errorMessage}
                </p>
              )}
            </form>
          )}
        </Card>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card variant="outlined" padding="md">
          <h3 className="font-semibold text-ink-primary">Direct email</h3>
          <p className="mt-2 text-body-sm text-ink-secondary">Prefer email? Reach us directly at support@fluentcopilot.com.</p>
          <Link href="mailto:support@fluentcopilot.com" className="mt-3 inline-block text-body-sm font-semibold text-primary-900 hover:underline">
            Open email
          </Link>
        </Card>

        <Card variant="flat" padding="md" className="border border-slate-200 bg-surface-muted/70">
          <h3 className="font-semibold text-ink-primary">Response expectations</h3>
          <ul className="mt-2 list-disc pl-5 space-y-1.5 text-body-sm text-ink-secondary">
            <li>We read every beta request and support message.</li>
            <li>During beta, replies may come in waves, but we review everything.</li>
            <li>For access requests, we follow up by email when spots open.</li>
          </ul>
        </Card>
      </section>

      <section className="mt-8">
        <Card variant="outlined" padding="md">
          <h3 className="font-semibold text-ink-primary">Quick links</h3>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-body-sm font-semibold">
            <Link href="/faq" className="text-primary-900 hover:text-primary-950">
              FAQ
            </Link>
            <Link href="/beta" className="text-primary-900 hover:text-primary-950">
              Beta access
            </Link>
            <Link href="/privacy" className="text-primary-900 hover:text-primary-950">
              Privacy
            </Link>
            <Link href="/login" className="text-primary-900 hover:text-primary-950">
              Sign in
            </Link>
          </div>
        </Card>
      </section>
    </div>
  )
}
