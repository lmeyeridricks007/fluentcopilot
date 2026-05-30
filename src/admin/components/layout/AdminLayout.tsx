import type { ReactNode } from 'react'
import { SidebarNavigation } from './SidebarNavigation'
import { AdminTopBar } from './AdminTopBar'

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50">
      <SidebarNavigation />
      <div className="flex flex-1 flex-col min-w-0">
        <AdminTopBar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
