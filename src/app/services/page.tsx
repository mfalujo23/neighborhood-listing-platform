import Link from 'next/link'
import ServiceCatalog from '../../components/ServiceCatalog'

export default function ServicesPage() {
  return (
    <main>
      <Link href="/" className="mb-6 inline-block rounded focus-visible:ring-2 focus-visible:ring-offset-2">
        Back to BarrioList
      </Link>
      {process.env.MIDTERM_LOCAL_FIXTURE_PREVIEW === 'true' && (
        <p role="note" className="mb-6 rounded border border-slate-600 bg-white p-4">
          Local preview with fictional services. Booking requests stay in a disposable local database.
        </p>
      )}
      <ServiceCatalog />
    </main>
  )
}
