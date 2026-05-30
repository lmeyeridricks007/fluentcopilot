import { clsx } from 'clsx'

export function SkillTrackProgressBar({
  unlockedLevelIndex,
  currentLevelIndex,
}: {
  /** 0–3 max unlocked */
  unlockedLevelIndex: number
  /** Level user is viewing / playing */
  currentLevelIndex: number
}) {
  const steps = [0, 1, 2, 3]
  return (
    <div className="flex gap-1.5 w-full" role="list" aria-label="Track level progress">
      {steps.map((i) => {
        const unlocked = i <= unlockedLevelIndex
        const active = i === currentLevelIndex
        return (
          <div
            key={i}
            role="listitem"
            className={clsx(
              'h-1.5 flex-1 rounded-full transition-colors',
              !unlocked && 'bg-slate-100',
              unlocked && !active && 'bg-primary-200',
              active && 'bg-primary-600 ring-2 ring-primary-200 ring-offset-1'
            )}
            aria-label={`Level ${i + 1}${unlocked ? ' unlocked' : ' locked'}`}
          />
        )
      })}
    </div>
  )
}
