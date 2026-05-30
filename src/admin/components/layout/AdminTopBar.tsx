import { useAdminAuthStore } from '../../store/adminAuthStore'
import { ROLES } from '../../config/roles'

export function AdminTopBar() {
  const { user, role, setRole } = useAdminAuthStore()
  return (
    <header className="h-14 flex-shrink-0 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
      <span className="text-body-sm text-ink-tertiary">FluentCopilot · Admin</span>
      <div className="flex items-center gap-4">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="text-body-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-ink-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Switch role"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <span className="text-body-sm text-ink-secondary">{user.email}</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-caption bg-slate-100 text-ink-secondary">
          Dev
        </span>
      </div>
    </header>
  )
}
