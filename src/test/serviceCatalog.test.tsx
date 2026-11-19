// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ServiceCatalog from '../components/ServiceCatalog'
import { ServiceListResponseSchema } from '../schemas/service'
import { BookingCreateSchema } from '../schemas/booking'

const services = [
  { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', title: 'Fictional home inspection', hourly_rate: 75, duration_minutes: 60, coverage_radius_miles: 10 },
  { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', title: 'Fictional home staging', hourly_rate: 90, duration_minutes: 90, coverage_radius_miles: 5 },
  { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', title: 'Fictional plumbing review', hourly_rate: 85, duration_minutes: 45, coverage_radius_miles: 8 },
]
const response = (value: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => value })
let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(response({ data: services }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
async function openForm() {
  const user = userEvent.setup()
  render(<ServiceCatalog />)
  const button = await screen.findByRole('button', { name: 'Request a booking for Fictional home inspection' })
  button.focus()
  await user.keyboard('{Enter}')
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Request a booking: Fictional home inspection' })))
  return { user, button }
}
async function fillBooking(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'resident@example.test')
  await user.type(screen.getByLabelText('Requested date'), '2027-01-03')
  await user.type(screen.getByLabelText('What do you need?'), 'Fictional inspection appointment request.')
}

describe('Mounted services catalog and booking interaction', () => {
  it('shows semantic cards with public specifications and exact Tailwind grid', async () => {
    render(<ServiceCatalog />)
    expect(screen.getByRole('status').textContent).toBe('Loading services…')
    await screen.findByRole('button', { name: /Request a booking for Fictional home inspection/ })
    expect(screen.getAllByRole('article')).toHaveLength(3)
    const article = screen.getAllByRole('article')[0]
    expect(article.querySelector('header h2')?.textContent).toBe(services[0].title)
    expect(article.querySelector('ul')?.textContent).toContain('$75.00')
    expect(article.querySelectorAll('li')).toHaveLength(3)
    const grid = screen.getByLabelText('Available services')
    for (const token of ['grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3']) expect(grid.classList.contains(token)).toBe(true)
  })
  it('fails safely on malformed runtime data instead of calling toFixed on a string', async () => {
    fetchMock.mockResolvedValue(response({ data: [{ ...services[0], hourly_rate: 'bad-rate' }] }))
    render(<ServiceCatalog />)
    expect((await screen.findByRole('alert')).textContent).toContain('Services could not be loaded')
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })
  it('renders a genuine empty state and allows a failed load to retry', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Synthetic offline')).mockResolvedValueOnce(response({ data: [] }))
    const user = userEvent.setup()
    render(<ServiceCatalog />)
    await user.click(await screen.findByRole('button', { name: 'Retry loading services' }))
    await screen.findByText('No approved services are available right now.')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('supports Enter, Tab, Shift+Tab and Space, returning focus on cancel', async () => {
    const { user, button } = await openForm()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByLabelText('Email'))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByLabelText('Requested date'))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByLabelText('What do you need?'))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Send booking request' }))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }))
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Send booking request' }))
    await user.tab()
    await user.keyboard(' ')
    expect(screen.queryByLabelText('Email')).toBeNull()
    expect(document.activeElement).toBe(button)
  })
  it('labels validation errors, focuses the first error and sends no invalid booking', async () => {
    const { user } = await openForm()
    await user.click(screen.getByRole('button', { name: 'Send booking request' }))
    const email = screen.getByLabelText('Email')
    expect(email.getAttribute('aria-invalid')).toBe('true')
    expect(email.getAttribute('aria-describedby')).toBe('client_email-error')
    expect(document.activeElement).toBe(email)
    expect(screen.getAllByRole('alert')).toHaveLength(3)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('submits only the strict booking contract and announces a private receipt after awaiting', async () => {
    const { user } = await openForm()
    fetchMock.mockResolvedValueOnce(response({ message: 'Booking request submitted.' }, 201))
    await fillBooking(user)
    await user.click(screen.getByRole('button', { name: 'Send booking request' }))
    const receipt = await screen.findByRole('status')
    expect(receipt.textContent).toBe('Booking request submitted.')
    expect(document.activeElement).toBe(receipt)
    expect(screen.queryByLabelText('Email')).toBeNull()
    const [url, options] = fetchMock.mock.calls[1]
    expect(url).toBe('/api/bookings')
    expect(BookingCreateSchema.parse(JSON.parse(options.body))).toEqual({
      service_id: services[0].id, client_email: 'resident@example.test',
      requested_date: '2027-01-03', notes: 'Fictional inspection appointment request.',
    })
    expect(receipt.textContent).not.toContain('resident@example.test')
  })
  it('keeps failed booking input for correction and does not expose server details', async () => {
    const { user } = await openForm()
    fetchMock.mockResolvedValueOnce(response({ error: 'Synthetic raw backend detail' }, 503))
    await fillBooking(user)
    await user.click(screen.getByRole('button', { name: 'Send booking request' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Your request could not be submitted. Please try again.')
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('resident@example.test')
    expect(document.body.textContent).not.toContain('Synthetic raw backend detail')
  })
  it('keeps visible focus ring and offset classes on every form control', async () => {
    await openForm()
    for (const control of document.querySelectorAll('input, textarea, button')) {
      expect(control.classList.contains('focus-visible:ring-2')).toBe(true)
      expect(control.classList.contains('focus-visible:ring-offset-2')).toBe(true)
    }
  })
  it.each([
    { ...services[0], extra: true },
    { ...services[0], hourly_rate: -1 },
    { ...services[0], duration_minutes: 10 },
  ])('rejects invalid public response record %j', (record) => {
    expect(ServiceListResponseSchema.safeParse({ data: [record] }).success).toBe(false)
  })
})
