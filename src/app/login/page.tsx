import Link from 'next/link'
import LoginForm from '../../auth/LoginForm'

export const dynamic = 'force-dynamic'
export default function LoginPage() {
  return <main className="mx-auto max-w-3xl space-y-5 p-6">
    <Link href="/" className="inline-block rounded px-2 py-1 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2">Back to BarrioList</Link>
    <h1>Sign in</h1>
    <p>Use your account email and password to open your dashboard.</p>
    <LoginForm />
  </main>
}
