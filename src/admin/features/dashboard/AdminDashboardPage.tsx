import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ListTodo, CheckCircle, AlertTriangle, FileCheck, RefreshCw, Layers } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'
import { SectionCard } from '../../components/ui/SectionCard'
import { dashboardService } from '../../services/mockServices'

export function AdminDashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: () => dashboardService.getStats(),
  })

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-body-sm">
          Failed to load dashboard stats.
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Content review and publishing overview"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Pending review"
          value={isLoading ? '—' : stats?.pending_review ?? 0}
          icon={ListTodo}
        />
        <StatCard
          label="Approved today"
          value={isLoading ? '—' : stats?.approved_today ?? 0}
          icon={CheckCircle}
        />
        <StatCard
          label="Validation failures"
          value={isLoading ? '—' : stats?.validation_failures ?? 0}
          icon={AlertTriangle}
        />
        <StatCard
          label="Published today"
          value={isLoading ? '—' : stats?.published_today ?? 0}
          icon={FileCheck}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Quick actions">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/queue"
              className="inline-flex items-center justify-center font-medium rounded-lg min-h-touch px-4 py-2 text-body-sm bg-primary-600 text-white hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
            >
              Open Review Queue
            </Link>
            <Link
              href="/admin/batches"
              className="inline-flex items-center justify-center font-medium rounded-lg min-h-touch px-4 py-2 text-body-sm bg-surface-muted text-ink-primary hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
            >
              View Batches
            </Link>
            <Link
              href="/admin/prompts"
              className="inline-flex items-center justify-center font-medium rounded-lg min-h-touch px-4 py-2 text-body-sm bg-surface-muted text-ink-primary hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
            >
              Prompt Library
            </Link>
            <Link
              href="/admin/audit"
              className="inline-flex items-center justify-center font-medium rounded-lg min-h-touch px-4 py-2 text-body-sm bg-surface-muted text-ink-primary hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
            >
              Audit Logs
            </Link>
          </div>
        </SectionCard>
        <SectionCard title="Needing attention">
          <ul className="space-y-2 text-body-sm">
            <li className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" aria-hidden />
              <span>{stats?.needing_regeneration ?? 0} artifacts suggested for regeneration</span>
            </li>
            <li className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-500 shrink-0" aria-hidden />
              <span>Recent batches in Batches</span>
            </li>
          </ul>
        </SectionCard>
      </div>
    </div>
  )
}
