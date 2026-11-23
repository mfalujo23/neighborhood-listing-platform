'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

const focus = 'rounded border border-slate-500 px-3 py-2 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2'
export default function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const alert = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (error) alert.current?.focus() }, [error])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = event.currentTarget
    const data = new FormData(form)
    setError(''); setPending(true)
    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      })
      if (!response.ok) {
        setError(response.status === 401 ? 'Email or password was not accepted.' : response.status === 429 ? 'Too many sign-in attempts. Try again shortly.' : 'Sign-in is temporarily unavailable. Please try again.')
        return
      }
      form.reset()
      router.replace('/realtor-dashboard'); router.refresh()
    } catch { setError('Sign-in is temporarily unavailable. Please try again.') }
    finally { setPending(false) }
  }
  return <form method="post" action="/api/auth/sign-in" onSubmit={submit} className="flex max-w-md flex-col gap-4" aria-label="Account sign in">
    <label className="flex flex-col gap-1" htmlFor="account-email">Email
      <input className={focus} id="account-email" name="email" type="email" autoComplete="username" maxLength={254} required aria-describedby={error ? 'sign-in-error' : undefined} />
    </label>
    <label className="flex flex-col gap-1" htmlFor="account-password">Password
      <input className={focus} id="account-password" name="password" type="password" autoComplete="current-password" maxLength={1024} required aria-describedby={error ? 'sign-in-error' : undefined} />
    </label>
    <button className={focus+' bg-blue-800 font-semibold text-white'} type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
    {error && <p id="sign-in-error" ref={alert} role="alert" tabIndex={-1} className="rounded border border-red-700 p-3 focus-visible:ring-2 focus-visible:ring-blue-700">{error}</p>}
  </form>
}
