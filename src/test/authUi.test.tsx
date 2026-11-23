// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
import LoginForm from '../auth/LoginForm'
import SignOutButton from '../auth/SignOutButton'

const emailValue = 'resident@example.test'
const passwordValue = 'Fictional-only-password-123!'
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>
const response = (status = 200) => ({ ok: status >= 200 && status < 300, status }) as Response
function deferred() {
  let resolve!: (value: Response) => void
  const promise = new Promise<Response>(done => { resolve = done })
  return { promise, resolve }
}
beforeEach(() => {
  router.replace.mockReset(); router.refresh.mockReset()
  fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response())
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
async function fillLogin(user: ReturnType<typeof userEvent.setup>, email = emailValue) {
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), passwordValue)
}
async function focusedAlert(text: string) {
  const alert = await screen.findByRole('alert')
  expect(alert.textContent).toBe(text)
  expect(alert.getAttribute('tabindex')).toBe('-1')
  await waitFor(() => expect(document.activeElement).toBe(alert))
  return alert
}

describe('LoginForm DOM and keyboard behavior', () => {
  it('exposes visible labels, useful autocomplete and a named native form', () => {
    render(<LoginForm />)
    expect(screen.getByRole('form', { name: 'Account sign in' }).getAttribute('method')).toBe('post')
    const email = screen.getByLabelText('Email') as HTMLInputElement
    const password = screen.getByLabelText('Password') as HTMLInputElement
    expect(email.type).toBe('email'); expect(email.name).toBe('email')
    expect(email.autocomplete).toBe('username'); expect(email.required).toBe(true)
    expect(password.type).toBe('password'); expect(password.name).toBe('password')
    expect(password.autocomplete).toBe('current-password'); expect(password.required).toBe(true)
    expect(screen.getByRole('button', { name: 'Sign in' }).getAttribute('type')).toBe('submit')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('supports Tab and Shift+Tab through email/password/submit with focus-visible styles', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    const email = screen.getByLabelText('Email')
    const password = screen.getByLabelText('Password')
    const submit = screen.getByRole('button', { name: 'Sign in' })
    await user.tab(); expect(document.activeElement).toBe(email)
    await user.tab(); expect(document.activeElement).toBe(password)
    await user.tab(); expect(document.activeElement).toBe(submit)
    await user.tab({ shift: true }); expect(document.activeElement).toBe(password)
    await user.tab({ shift: true }); expect(document.activeElement).toBe(email)
    for (const control of [email, password, submit]) expect(control.classList.contains('focus-visible:ring-2')).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('native required and email constraints stop invalid requests', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(fetchMock).not.toHaveBeenCalled()
    await fillLogin(user, 'invalid-email')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect((screen.getByLabelText('Email') as HTMLInputElement).validity.typeMismatch).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(router.replace).not.toHaveBeenCalled()
  })
  it('Enter submits fictional credentials and navigates only after the pending success resolves', async () => {
    const pending = deferred()
    fetchMock.mockReturnValue(pending.promise)
    const user = userEvent.setup()
    render(<LoginForm />)
    await fillLogin(user)
    await user.keyboard('{Enter}')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/sign-in', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailValue, password: passwordValue }),
    })
    expect((screen.getByRole('button', { name: 'Signing in…' }) as HTMLButtonElement).disabled).toBe(true)
    expect(router.replace).not.toHaveBeenCalled()
    expect(router.refresh).not.toHaveBeenCalled()
    pending.resolve(response())
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/realtor-dashboard'))
    expect(router.replace).toHaveBeenCalledTimes(1)
    expect(router.refresh).toHaveBeenCalledTimes(1)
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('')
  })
  it('Space activates the native submit button', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    await fillLogin(user)
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sign in' }))
    await user.keyboard(' ')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(router.replace).toHaveBeenCalledWith('/realtor-dashboard')
  })
  it('blocks double Enter, repeated submit events and button activation during an in-flight request', async () => {
    const pending = deferred()
    fetchMock.mockReturnValue(pending.promise)
    const user = userEvent.setup()
    render(<LoginForm />)
    await fillLogin(user)
    await user.keyboard('{Enter}{Enter}')
    fireEvent.submit(screen.getByRole('form', { name: 'Account sign in' }))
    await user.click(screen.getByRole('button', { name: 'Signing in…' }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(router.replace).not.toHaveBeenCalled()
    pending.resolve(response(401))
    await focusedAlert('Email or password was not accepted.')
    expect((screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement).disabled).toBe(false)
  })
  it.each([
    [401, 'Email or password was not accepted.'],
    [429, 'Too many sign-in attempts. Try again shortly.'],
    [503, 'Sign-in is temporarily unavailable. Please try again.'],
  ])('focuses a generic alert and preserves the page after HTTP%s', async (status, message) => {
    fetchMock.mockResolvedValue(response(status))
    const user = userEvent.setup()
    render(<LoginForm />)
    await fillLogin(user)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    const alert = await focusedAlert(message)
    expect(alert.id).toBe('sign-in-error')
    expect(screen.getByLabelText('Email').getAttribute('aria-describedby')).toBe(alert.id)
    expect(screen.getByLabelText('Password').getAttribute('aria-describedby')).toBe(alert.id)
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe(emailValue)
    expect(router.replace).not.toHaveBeenCalled()
    expect(router.refresh).not.toHaveBeenCalled()
  })
  it('network failure stays generic, focuses the alert and does not navigate', async () => {
    fetchMock.mockRejectedValue(new Error('Synthetic private transport detail'))
    const user = userEvent.setup()
    render(<LoginForm />)
    await fillLogin(user)
    await user.keyboard('{Enter}')
    const alert = await focusedAlert('Sign-in is temporarily unavailable. Please try again.')
    expect(alert.textContent).not.toContain('private transport')
    expect(router.replace).not.toHaveBeenCalled()
    expect(router.refresh).not.toHaveBeenCalled()
  })
  it('retries after invalid credentials and navigates only after the later success', async () => {
    const pending = deferred()
    fetchMock.mockResolvedValueOnce(response(401)).mockReturnValueOnce(pending.promise)
    const user = userEvent.setup()
    render(<LoginForm />)
    await fillLogin(user)
    await user.keyboard('{Enter}')
    await focusedAlert('Email or password was not accepted.')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(router.replace).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
    pending.resolve(response())
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/realtor-dashboard'))
    expect(router.refresh).toHaveBeenCalledTimes(1)
  })
})

describe('SignOutButton DOM and keyboard behavior', () => {
  it.each(['{Enter}', ' '])('supports native keyboard activation %j and navigates after success', async key => {
    const pending = deferred()
    fetchMock.mockReturnValue(pending.promise)
    const user = userEvent.setup()
    render(<><a href="#before">Before</a><SignOutButton /><a href="#after">After</a></>)
    const button = screen.getByRole('button', { name: 'Sign out' })
    expect(button.getAttribute('type')).toBe('button')
    expect(button.classList.contains('focus-visible:ring-2')).toBe(true)
    await user.tab(); expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Before' }))
    await user.tab(); expect(document.activeElement).toBe(button)
    await user.tab(); expect(document.activeElement).toBe(screen.getByRole('link', { name: 'After' }))
    await user.tab({ shift: true }); expect(document.activeElement).toBe(button)
    await user.keyboard(key)
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/sign-out', { method: 'POST', credentials: 'same-origin' })
    expect(router.replace).not.toHaveBeenCalled()
    expect(router.refresh).not.toHaveBeenCalled()
    pending.resolve(response(204))
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'))
    expect(router.replace).toHaveBeenCalledTimes(1)
    expect(router.refresh).toHaveBeenCalledTimes(1)
  })
  it('prevents repeated requests while signing out', async () => {
    const pending = deferred()
    fetchMock.mockReturnValue(pending.promise)
    const user = userEvent.setup()
    render(<SignOutButton />)
    await user.tab()
    await user.keyboard('{Enter}{Enter}')
    const button = screen.getByRole('button', { name: 'Signing out…' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    await user.click(button)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    pending.resolve(response(503))
    await focusedAlert('Sign-out could not be completed. Please try again.')
    expect((screen.getByRole('button', { name: 'Sign out' }) as HTMLButtonElement).disabled).toBe(false)
    expect(router.replace).not.toHaveBeenCalled()
  })
  it.each(['http', 'network'])('retains the current screen and focuses its alert on %s failure', async failure => {
    if (failure === 'http') fetchMock.mockResolvedValue(response(503))
    else fetchMock.mockRejectedValue(new Error('Synthetic private sign-out transport detail'))
    const user = userEvent.setup()
    render(<SignOutButton />)
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    const alert = await focusedAlert('Sign-out could not be completed. Please try again.')
    expect(alert.textContent).not.toContain('private')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeDefined()
    expect(router.replace).not.toHaveBeenCalled()
    expect(router.refresh).not.toHaveBeenCalled()
  })
  it('allows a failed sign-out to retry and only then navigates on success', async () => {
    const pending = deferred()
    fetchMock.mockResolvedValueOnce(response(503)).mockReturnValueOnce(pending.promise)
    const user = userEvent.setup()
    render(<SignOutButton />)
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    await focusedAlert('Sign-out could not be completed. Please try again.')
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(router.replace).not.toHaveBeenCalled()
    pending.resolve(response(204))
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'))
    expect(router.refresh).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

