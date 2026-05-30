import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { mockAuthService } from '../services/mockAuthService'
import type { AuthApiError } from '../types'

const signUpSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignUpFormValues = z.infer<typeof signUpSchema>

export function SignUpPage() {
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async (values: SignUpFormValues) => {
    const parsed = signUpSchema.safeParse(values)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      if (fieldErrors.name) setError('name', { message: fieldErrors.name[0] })
      if (fieldErrors.email) setError('email', { message: fieldErrors.email[0] })
      if (fieldErrors.password) setError('password', { message: fieldErrors.password[0] })
      if (fieldErrors.confirmPassword) setError('confirmPassword', { message: fieldErrors.confirmPassword[0] })
      return
    }
    setApiError(null)
    setLoading(true)
    try {
      await mockAuthService.signUp({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      })
    } catch (err) {
      const e = err as AuthApiError
      setApiError(e?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface safe-area-pt safe-area-pb">
      <div className="flex-1 px-4 py-6 flex flex-col max-w-md mx-auto w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-body-sm text-ink-secondary hover:text-ink-primary mb-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back
        </Link>

        <Card variant="outlined" padding="md" className="mb-6">
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>Sign up with your email to get started.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {apiError && (
              <div
                className="p-3 rounded-lg bg-error/10 text-error text-body-sm"
                role="alert"
              >
                {apiError}
              </div>
            )}
            <Input
              label="Name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              error={errors.name?.message}
              {...register('name')}
            />
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
              autoComplete="new-password"
              placeholder="At least 8 characters"
              hint="Minimum 8 characters"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <Button type="submit" fullWidth size="lg" loading={loading} disabled={loading}>
              Create account
            </Button>
          </form>
        </Card>

        <div className="space-y-3">
          <p className="text-body-sm text-ink-secondary text-center">Or sign up with</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setApiError('Google sign-in is not connected yet. Use email.')}
              aria-label="Sign up with Google"
            >
              Google
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setApiError('Apple sign-in is not connected yet. Use email.')}
              aria-label="Sign up with Apple"
            >
              Apple
            </Button>
          </div>
        </div>

        <p className="text-body-sm text-ink-secondary text-center mt-6">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-primary-600 hover:text-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
