import Link from 'next/link'
import { Card } from '@/components/ui/Card'

export type LegalSection = {
  id: string
  title: string
  body?: string
  bullets?: string[]
}

export function LegalPageLayout({
  pageTitle,
  heroHeading,
  intro,
  summaryBullets,
  sections,
  lastUpdated,
  contactTitle,
  contactBody,
}: {
  pageTitle: string
  heroHeading: string
  intro: string
  summaryBullets: string[]
  sections: LegalSection[]
  lastUpdated: string
  contactTitle: string
  contactBody: string
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-5 py-12 sm:py-16">
      <header>
        <p className="text-caption font-bold uppercase tracking-wide text-primary-800">{pageTitle}</p>
        <h1 className="mt-3 text-display sm:text-4xl font-bold text-ink-primary">{heroHeading}</h1>
        <p className="mt-4 max-w-3xl text-body-lg text-ink-secondary leading-relaxed">{intro}</p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 h-fit">
          <Card variant="outlined" padding="sm" className="bg-surface-elevated">
            <p className="text-caption font-bold uppercase tracking-wide text-ink-secondary mb-2">On this page</p>
            <nav className="space-y-1" aria-label={`${pageTitle} sections`}>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block rounded px-2 py-1.5 text-body-sm text-ink-secondary hover:text-ink-primary hover:bg-surface-muted transition-colors"
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </Card>
        </aside>

        <main className="space-y-6">
          <Card variant="elevated" padding="md" className="border border-slate-200">
            <p className="text-body-sm font-semibold text-ink-primary">Quick summary</p>
            <ul className="mt-3 space-y-2 list-disc pl-5 text-body-sm text-ink-secondary">
              {summaryBullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </Card>

          <div className="space-y-4">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
                  <h2 className="text-title font-bold text-ink-primary">{s.title}</h2>
                  {s.body && <p className="mt-3 text-body text-ink-secondary leading-relaxed">{s.body}</p>}
                  {s.bullets && (
                    <ul className="mt-3 space-y-2 list-disc pl-5 text-body-sm text-ink-secondary">
                      {s.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                </Card>
              </section>
            ))}
          </div>

          <Card variant="flat" padding="md" className="border border-slate-200 bg-surface-muted/70">
            <p className="text-caption font-bold uppercase tracking-wide text-ink-secondary">Last updated</p>
            <p className="mt-1 text-body-sm text-ink-primary">{lastUpdated}</p>
          </Card>

          <Card variant="outlined" padding="md" className="border-primary-200 bg-primary-50/40">
            <h3 className="font-bold text-ink-primary">{contactTitle}</h3>
            <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">{contactBody}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-body-sm font-semibold">
              <Link href="/contact" className="text-primary-900 hover:underline">
                Contact support
              </Link>
              <Link href="/privacy" className="text-primary-900 hover:underline">
                Privacy
              </Link>
              <Link href="/terms" className="text-primary-900 hover:underline">
                Terms
              </Link>
              <Link href="/cookies" className="text-primary-900 hover:underline">
                Cookies
              </Link>
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}
