/** Section head — matches Talk → Now typography (flat, no card shell). */
export function ImproveSectionIntro({
  title,
  kicker,
  id,
}: {
  title: string
  /** One short coaching line under the title */
  kicker?: string
  id?: string
}) {
  return (
    <div>
      <h2 id={id} className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate-600">
        {title}
      </h2>
      {kicker ? (
        <p className="mt-1.5 max-w-prose text-[15px] font-medium leading-snug text-slate-700">{kicker}</p>
      ) : null}
    </div>
  )
}
