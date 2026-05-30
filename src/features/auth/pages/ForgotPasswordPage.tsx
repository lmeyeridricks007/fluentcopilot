import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { JoinWaitlistAnchor } from '@/features/marketing'

/**
 * Closed beta: there is no automated email reset. Be explicit so users don’t wait on a message that will never arrive.
 */
export function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface safe-area-pt safe-area-pb">
      <div className="flex-1 px-4 py-6 flex flex-col max-w-md mx-auto w-full">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-body-sm text-ink-secondary hover:text-ink-primary mb-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to sign in
        </Link>

        <Card variant="outlined" padding="md" className="mb-6">
          <CardHeader>
            <CardTitle>Password help during closed beta</CardTitle>
            <CardDescription>
              We don&apos;t send automated reset links yet. Use the password from your beta invitation email, or reach
              out through the same channel if you need a new one.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6 space-y-4 text-body-sm text-ink-secondary">
            <ul className="list-disc pl-5 space-y-2">
              <li>Check the invite email for your temporary or assigned password.</li>
              <li>If it still doesn&apos;t work, reply to that email or contact the team the same way you received access.</li>
              <li>
                Not invited yet? Request access from the site — we&apos;ll email you; no need to draft a message yourself.
              </li>
            </ul>
            <JoinWaitlistAnchor
              surface="forgot_password_page"
              className="flex w-full min-h-touch items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-body font-semibold text-white hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 shadow-card"
            >
              Request beta access
            </JoinWaitlistAnchor>
          </div>
        </Card>

        <Link href="/login">
          <Button fullWidth variant="secondary">
            Back to sign in
          </Button>
        </Link>
      </div>
    </div>
  )
}
