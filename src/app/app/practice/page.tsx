import { redirect } from 'next/navigation'

/** Hub lives at Talk — deep practice routes stay under `/app/practice/*`. */
export default function Page() {
  redirect('/app/talk')
}
