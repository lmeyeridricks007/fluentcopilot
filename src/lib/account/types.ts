/** Account/settings UI — derived view models only; source of truth remains auth + learner profile. */
export type AccountIdentityView = {
  displayName: string
  email: string
  isInviteBeta: boolean
}
