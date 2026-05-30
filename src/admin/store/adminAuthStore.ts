import { create } from 'zustand'
import type { AdminRole } from '../config/roles'

interface AdminAuthState {
  role: AdminRole
  user: { id: string; name: string; email: string }
  setRole: (role: AdminRole) => void
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  role: 'editor',
  user: { id: 'admin-1', name: 'Content Reviewer', email: 'reviewer@example.com' },
  setRole: (role) => set({ role }),
}))
