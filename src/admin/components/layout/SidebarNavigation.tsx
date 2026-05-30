'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ListTodo,
  Layers,
  BookOpen,
  Map,
  FileCheck,
  ClipboardCheck,
  History,
  Settings,
} from 'lucide-react'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/queue', end: false, icon: ListTodo, label: 'Review Queue' },
  { to: '/admin/batches', end: false, icon: Layers, label: 'Batches' },
  { to: '/admin/prompts', end: false, icon: BookOpen, label: 'Prompts' },
  { to: '/admin/scenarios', end: false, icon: Map, label: 'Scenarios' },
  { to: '/admin/published', end: false, icon: FileCheck, label: 'Published' },
  { to: '/admin/validation', end: false, icon: ClipboardCheck, label: 'Validation Logs' },
  { to: '/admin/audit', end: false, icon: History, label: 'Audit Logs' },
  { to: '/admin/settings', end: false, icon: Settings, label: 'Settings' },
]

export function SidebarNavigation() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <h1 className="text-body font-semibold text-ink-primary">Content Admin</h1>
        <p className="text-caption text-ink-tertiary mt-0.5">Review & Publish</p>
      </div>
      <nav className="flex-1 p-2 space-y-0.5" aria-label="Admin navigation">
        {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => {
          const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
          return (
            <Link
              key={to}
              href={to}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-ink-secondary hover:bg-slate-100 hover:text-ink-primary',
              )}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
