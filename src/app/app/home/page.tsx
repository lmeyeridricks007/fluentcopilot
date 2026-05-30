import { redirect } from 'next/navigation'

/** Legacy dashboard — primary daily surface is Talk. */
export default function Page() {
  redirect('/app/talk')
}
