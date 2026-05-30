'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth/useAuth'
import { ROUTES } from '@/lib/routing/authRedirects'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

export interface SignOutButtonProps {
  /** Where to send the user after sign-out */
  redirectTo?: string
  className?: string
  variant?: 'ghost' | 'secondary'
  fullWidth?: boolean
  /** Passed to analytics (e.g. `account_settings`) */
  analyticsSurface?: string
}

export function SignOutButton({
  redirectTo = ROUTES.postSignOut,
  className,
  variant = 'ghost',
  fullWidth = true,
  analyticsSurface = 'unknown',
}: SignOutButtonProps) {
  const router = useRouter()
  const { logout } = useAuth()

  const handleClick = () => {
    track(ANALYTICS_EVENTS.sign_out_clicked, { surface: analyticsSurface })
    logout()
    router.push(redirectTo)
  }

  return (
    <Button
      type="button"
      variant={variant}
      fullWidth={fullWidth}
      onClick={handleClick}
      className={className}
      aria-label="Sign out"
    >
      <LogOut className="w-5 h-5 mr-2 shrink-0" aria-hidden />
      Sign out
    </Button>
  )
}
