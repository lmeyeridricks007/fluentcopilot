/**
 * Compact invite-only context for auth-adjacent pages.
 */
export function InviteOnlyCallout() {
  return (
    <div
      className="rounded-xl border border-primary-300/80 bg-primary-50/90 px-4 py-3 sm:px-5 sm:py-4"
      role="note"
    >
      <p className="text-body-sm text-ink-secondary leading-relaxed">
        <span className="font-semibold text-ink-primary">Invite-only beta.</span> Public sign-up isn&apos;t open yet — only
        invited learners can sign in today. Request access with your email (no separate mail app needed) and we&apos;ll
        reach out when spots open.
      </p>
    </div>
  )
}
