'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { useAuth } from '@/lib/auth/useAuth'
import { isMockAuthLoginError } from '@/lib/auth/authTypes'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { getPrivateEntryPath, isSafePrivateNextPath } from '@/lib/routing/authRedirects'
import { useAuthStore } from '@/store/authStore'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export interface LoginFormProps {
  /** Called after successful login, before navigation */
  onSuccess?: () => void
  /** Social OAuth row — off by default for closed-beta polish */
  showSocialRow?: boolean
  signUpSlot?: ReactNode
  forgotPasswordHref?: string
}

export function LoginForm({
  onSuccess,
  showSocialRow = false,
  signUpSlot,
  forgotPasswordHref = '/forgot-password',
}: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({ defaultValues: { email: '', password: '' } })

  const onSubmit = async (values: LoginFormValues) => {
    const parsed = loginSchema.safeParse(values)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      if (fieldErrors.email) setError('email', { message: fieldErrors.email[0] })
      if (fieldErrors.password) setError('password', { message: fieldErrors.password[0] })
      return
    }
    track(ANALYTICS_EVENTS.sign_in_clicked, { surface: 'login_form' })
    setApiError(null)
    setErrorCode(null)
    setLoading(true)
    try {
      await login(
        { email: parsed.data.email, password: parsed.data.password },
        { loginSurface: 'public_login_page' },
      )
      onSuccess?.()
      const { hasCompletedOnboarding } = useAuthStore.getState()
      const nextParam = searchParams.get('next')
      let destination = getPrivateEntryPath(hasCompletedOnboarding)
      if (hasCompletedOnboarding && isSafePrivateNextPath(nextParam)) {
        destination = nextParam
      }
      router.replace(destination)
    } catch (err) {
      if (isMockAuthLoginError(err)) {
        setApiError(err.message)
        setErrorCode(err.code)
      } else {
        setApiError('Something went wrong. Please try again.')
        setErrorCode('unknown')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card variant="outlined" padding="md" className="mb-6">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Invite-only closed beta. Use the email address that received your invitation and the password we sent you.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {apiError && (
            <div className="p-3 rounded-lg bg-error/10 text-error text-body-sm" role="alert">
              <p>{apiError}</p>
              {errorCode === 'not_found' ? (
                <p className="mt-2 text-caption text-ink-secondary">
                  If you haven&apos;t received a beta invite yet,{' '}
                  <Link href="/beta" className="font-medium text-primary-700 hover:text-primary-900">
                    request access on the waitlist
                  </Link>
                  .
                </p>
              ) : errorCode === 'password_invalid' ? (
                <p className="mt-2 text-caption text-ink-secondary">
                  Tip: use the password from your invitation email. Still stuck? See{' '}
                  <Link href="/beta" className="font-medium text-primary-700 hover:text-primary-900">
                    beta access help
                  </Link>{' '}
                  or{' '}
                  <Link href="/forgot-password" className="font-medium text-primary-700 hover:text-primary-900">
                    password help for beta
                  </Link>
                  .
                </p>
              ) : (
                <p className="mt-2 text-caption text-ink-secondary">
                  Questions about access? See{' '}
                  <Link href="/beta" className="font-medium text-primary-700 hover:text-primary-900">
                    how the closed beta works
                  </Link>
                  .
                </p>
              )}
            </div>
          )}
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex justify-end">
            <Link
              href={forgotPasswordHref}
              className="text-body-sm text-primary-600 hover:text-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
            >
              Password help (beta)
            </Link>
          </div>
          <Button type="submit" fullWidth size="lg" loading={loading} disabled={loading}>
            Sign in
          </Button>
        </form>
      </Card>

      {showSocialRow && (
        <div className="space-y-3">
          <p className="text-body-sm text-ink-secondary text-center">Or continue with</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setApiError('Google sign-in is not connected yet. Use email or your beta invite.')}
              aria-label="Sign in with Google"
            >
              Google
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setApiError('Apple sign-in is not connected yet. Use email or your beta invite.')}
              aria-label="Sign in with Apple"
            >
              Apple
            </Button>
          </div>
        </div>
      )}

      {signUpSlot != null && <div className="mt-6">{signUpSlot}</div>}
    </>
  )
}
