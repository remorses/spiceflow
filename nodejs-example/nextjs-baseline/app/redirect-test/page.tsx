import { redirect } from 'next/navigation'

// Force dynamic rendering so redirect runs on every request
export const dynamic = 'force-dynamic'

export default function RedirectTest() {
  redirect('/about')
}
