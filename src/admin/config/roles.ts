/**
 * Admin — role and permission config (mocked).
 */

export type AdminRole = 'reviewer' | 'editor' | 'admin'

export const ROLES: AdminRole[] = ['reviewer', 'editor', 'admin']

export function canEdit(role: AdminRole): boolean {
  return role === 'editor' || role === 'admin'
}

export function canPublish(role: AdminRole): boolean {
  return role === 'admin'
}

export function canManagePrompts(role: AdminRole): boolean {
  return role === 'admin'
}

export function canManageScenarios(role: AdminRole): boolean {
  return role === 'admin'
}

export function canViewAudit(role: AdminRole): boolean {
  return role === 'admin'
}
