import { redirect } from 'next/navigation'

/** Review hub is now under Coach — deep routes keep `/app/review/*`. */
export default function Page() {
  redirect('/app/coach?tab=review')
}
