import type { PublicService } from '../schemas/service'

export type Service = PublicService

interface ServiceCardProps {
  service: Service
  onBook: (service: Service) => void
  disabled?: boolean
}

export default function ServiceCard({ service, onBook, disabled = false }: ServiceCardProps) {
  const titleId = `service-title-${service.id}`

  return (
    <article className="service-card flex flex-col gap-5 bg-white p-5" aria-labelledby={titleId}>
      <header>
        <h2 id={titleId}>{service.title}</h2>
      </header>

      <ul className="service-card__details">
        <li>
          <strong>Hourly rate:</strong> ${service.hourly_rate.toFixed(2)}
        </li>
        <li>
          <strong>Duration:</strong> {service.duration_minutes} minutes
        </li>
        <li>
          <strong>Coverage radius:</strong> {service.coverage_radius_miles} miles
        </li>
      </ul>

      <button
        type="button"
        className="service-card__button focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
        aria-label={`Request a booking for ${service.title}`}
        onClick={() => onBook(service)}
        disabled={disabled}
      >
        Request a booking
      </button>
    </article>
  )
}
