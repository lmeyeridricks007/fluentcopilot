'use client'

import Link from 'next/link'
import { User } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/authStore'

function initialsFromUser(name: string | undefined, email: string | undefined): string {
  const raw = (name || email || '').trim()
  if (!raw) return ''
  if (name && name.includes(' ')) {
    const p = name.trim().split(/\s+/)
    return `${p[0][0] ?? ''}${p[1]?.[0] ?? ''}`.toUpperCase().slice(0, 2)
  }
  const local = email?.split('@')[0] ?? raw
  return local.slice(0, 2).toUpperCase()
}

/**
 * Top-right account entry — full settings surface; avatar shows initials when available.
 */
export function ProfileAvatarLink({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user)
  const initials = initialsFromUser(user?.name, user?.email)

  return (
    <Link
      href="/app/settings"
      className={clsx(
        'flex h-11 w-11 min-h-touch min-w-touch items-center justify-center rounded-full',
        'ring-2 ring-slate-200/90 bg-gradient-to-br from-primary-50 to-slate-100 text-primary-900',
        'text-caption font-bold tracking-tight shadow-sm transition-[transform,box-shadow] active:scale-[0.96]',
        'hover:ring-primary-300/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
        className
      )}
      aria-label="Account and settings"
    >
      {initials ? (
        <span aria-hidden className="text-[13px] leading-none">
          {initials}
        </span>
      ) : (
        <User className="w-5 h-5 text-primary-800" strokeWidth={2} aria-hidden />
      )}
    </Link>
  )
}
