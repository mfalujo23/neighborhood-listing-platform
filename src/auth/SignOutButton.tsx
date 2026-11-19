'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const alert = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (error) alert.current?.focus() }, [error])
  async function signOut() {
    if (pending) return
    setPending(true); setError(false)
    try {
      const response = await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'same-origin' })
      if (!response.ok) { setError(true); return }
      router.replace('/login'); router.refresh()
    } catch { setError(true) }
    finally { setPending(false) }
  }
  return <div className="my-4">
    <button type="button" onClick={signOut} disabled={pending} className="rounded border border-slate-600 px-3 py-2 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2">{pending ? 'Signing out…' : 'Sign out'}</button>
    {error && <p ref={alert} role="alert" tabIndex={-1}>Sign-out could not be completed. Please try again.</p>}
  </div>
}
