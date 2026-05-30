export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-body-sm text-ink-secondary">Loading...</p>
    </div>
  )
}
