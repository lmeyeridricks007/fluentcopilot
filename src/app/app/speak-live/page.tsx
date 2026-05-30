import { redirect } from 'next/navigation'
import { APP_SPEAK_LIVE } from '@/lib/routing/appRoutes'

/** Product alias — canonical route is `/app/talk/live`. */
export default function Page() {
  redirect(APP_SPEAK_LIVE)
}
