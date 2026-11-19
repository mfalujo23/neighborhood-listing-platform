'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import ServiceCard, { type Service } from './ServiceCard'
import { ServiceListResponseSchema } from '../schemas/service'
import { BookingCreateSchema, BookingReceiptSchema } from '../schemas/booking'

type BookingField = 'client_email' | 'requested_date' | 'notes'
type FieldErrors = Partial<Record<BookingField, string>>
const focusClass = 'focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2'
const fieldMessages: Record<BookingField, string> = {
  client_email: 'Enter a valid email address.',
  requested_date: 'Choose a valid calendar date.',
  notes: 'Describe your request in 10–2000 characters.',
}

export default function ServiceCatalog() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [bookingMessage, setBookingMessage] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const bookingHeading = useRef<HTMLHeadingElement>(null)
  const receipt = useRef<HTMLParagraphElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    async function loadServices() {
      try {
        const response = await fetch('/api/services', { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('Unavailable')
        const result = ServiceListResponseSchema.parse(await response.json())
        if (active) setServices(result.data)
      } catch {
        if (active) setLoadError('Services could not be loaded. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadServices()
    return () => { active = false; controller.abort() }
  }, [loadAttempt])

  useEffect(() => {
    if (selectedService) bookingHeading.current?.focus()
  }, [selectedService])
  useEffect(() => {
    if (bookingMessage) receipt.current?.focus()
  }, [bookingMessage])

  function chooseService(service: Service) {
    if (submitting) return
    opener.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null
    setSelectedService(service)
    setBookingMessage('')
    setBookingError('')
    setFieldErrors({})
  }
  function cancelBooking() {
    setSelectedService(null)
    setBookingError('')
    setFieldErrors({})
    opener.current?.focus()
  }
  function retry() {
    setLoading(true)
    setLoadError('')
    setServices([])
    setLoadAttempt((attempt) => attempt + 1)
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedService || submitting) return
    // React currentTarget does not remain available after awaiting a request.
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const parsed = BookingCreateSchema.safeParse({
      service_id: selectedService.id,
      client_email: String(form.get('client_email') ?? ''),
      requested_date: String(form.get('requested_date') ?? ''),
      notes: String(form.get('notes') ?? ''),
    })
    setBookingError('')
    setBookingMessage('')
    if (!parsed.success) {
      const errors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field === 'client_email' || field === 'requested_date' || field === 'notes') errors[field] ??= fieldMessages[field]
      }
      setFieldErrors(errors)
      const first = (['client_email', 'requested_date', 'notes'] as const).find((field) => errors[field])
      if (first) (formElement.elements.namedItem(first) as HTMLElement | null)?.focus()
      return
    }
    setFieldErrors({})
    setSubmitting(true)
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      if (!response.ok) {
        setBookingError(response.status === 403
          ? 'This service is no longer available for booking. Reload the service list.'
          : 'Your request could not be submitted. Please try again.')
        return
      }
      const result = BookingReceiptSchema.parse(await response.json())
      formElement.reset()
      setSelectedService(null)
      setBookingMessage(result.message)
    } catch {
      setBookingError('Your request could not be submitted. Please try again.')
    } finally { setSubmitting(false) }
  }

  return (
    <section aria-labelledby="services-heading" aria-busy={loading}>
      <h1 id="services-heading">Neighborhood services</h1>
      <p>Browse approved local services and request an appointment. Only the provider and authorized administrators can review booking details.</p>
      {loading && <p role="status">Loading services…</p>}
      {loadError && (
        <div>
          <p role="alert">{loadError}</p>
          <button type="button" className={`mt-3 rounded border border-blue-700 px-4 py-2 ${focusClass}`} onClick={retry}>Retry loading services</button>
        </div>
      )}
      {!loading && !loadError && services.length === 0 && <p>No approved services are available right now.</p>}
      {bookingMessage && <p role="status" tabIndex={-1} ref={receipt} className="my-4 rounded border border-green-800 bg-white p-4">{bookingMessage}</p>}
      {services.length > 0 && (
        <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Available services">
          {services.map((service) => <ServiceCard key={service.id} service={service} onBook={chooseService} disabled={submitting} />)}
        </section>
      )}
      {selectedService && (
        <section className="booking-panel" aria-labelledby="booking-heading">
          <h2 id="booking-heading" ref={bookingHeading} tabIndex={-1} className="text-2xl font-semibold">Request a booking: {selectedService.title}</h2>
          <p id="booking-guidance">Enter an email address, a calendar date, and 10–2000 characters describing the request. Do not include sensitive information.</p>
          <form onSubmit={submitBooking} noValidate aria-describedby="booking-guidance" aria-busy={submitting}>
            <label htmlFor="client_email">Email</label>
            <input id="client_email" name="client_email" type="email" autoComplete="email" maxLength={254} required className={focusClass} aria-invalid={Boolean(fieldErrors.client_email)} aria-describedby={fieldErrors.client_email ? 'client_email-error' : undefined} />
            {fieldErrors.client_email && <p id="client_email-error" role="alert">{fieldErrors.client_email}</p>}
            <label htmlFor="requested_date">Requested date</label>
            <input id="requested_date" name="requested_date" type="date" required className={focusClass} aria-invalid={Boolean(fieldErrors.requested_date)} aria-describedby={fieldErrors.requested_date ? 'requested_date-error' : undefined} />
            {fieldErrors.requested_date && <p id="requested_date-error" role="alert">{fieldErrors.requested_date}</p>}
            <label htmlFor="notes">What do you need?</label>
            <textarea id="notes" name="notes" minLength={10} maxLength={2000} required className={focusClass} aria-invalid={Boolean(fieldErrors.notes)} aria-describedby={fieldErrors.notes ? 'notes-error' : undefined} />
            {fieldErrors.notes && <p id="notes-error" role="alert">{fieldErrors.notes}</p>}
            {bookingError && <p role="alert">{bookingError}</p>}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={submitting} className={focusClass}>{submitting ? 'Sending request…' : 'Send booking request'}</button>
              <button type="button" disabled={submitting} className={focusClass} onClick={cancelBooking}>Cancel</button>
            </div>
          </form>
        </section>
      )}
    </section>
  )
}
