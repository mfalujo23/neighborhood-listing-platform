import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findSyntheticProperty, syntheticPropertyIds } from '../../../lib/syntheticProperties'
import styles from '../../../components/listings.module.css'

export const metadata: Metadata = { title: 'Fictional property details' }
export const dynamicParams = false

export function generateStaticParams() {
  return syntheticPropertyIds().map(propertyId => ({ propertyId }))
}

export default async function PropertyDetailPage({ params }: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  const property = findSyntheticProperty(propertyId)
  if (!property) notFound()

  return <main className={styles.page}>
    <nav aria-label="Property navigation">
      <Link className={styles.detailLink} href="/listings">Back to all sample listings</Link>
    </nav>
    <header className={styles.intro}>
      <p className={styles.eyebrow}>Synthetic listing</p>
      <h1>{property.street}</h1>
      <p>{property.city}, {property.state} {property.zip_code}</p>
      <p>This fictional classroom property is not a real offer.</p>
    </header>
    <article aria-label={`Property details for ${property.street}`} className={styles.card}>
      <Image src="/synthetic-home.svg" width={640} height={360} className={styles.image}
        alt="Schematic house illustration, not a photograph of this fictional property" />
      <div className={styles.cardBody}>
        <h2>Property facts</h2>
        <ul className={styles.facts} aria-label="Property facts">
          <li>Price: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(property.price)}</li>
          <li>Bedrooms: {property.bedrooms}</li>
          <li>Bathrooms: {property.bathrooms}</li>
          <li>Size: {property.square_feet.toLocaleString('en-US')} sq ft</li>
          <li>ZIP code: {property.zip_code}</li>
        </ul>
        <h2>Features</h2>
        {property.amenities.length ? <ul className={styles.facts} aria-label="Features">
          {property.amenities.map(amenity => <li key={amenity}>{amenity.replaceAll('_', ' ')}</li>)}
        </ul> : <p>No amenities are listed.</p>}
        <section aria-labelledby="property-sponsors-heading" className={styles.sponsor}>
          <p className={styles.eyebrow}>Sponsored · Fictional classroom examples</p>
          <h2 id="property-sponsors-heading">Fictional local sponsors</h2>
          <p>No business paid for this example.</p>
          {property.local_sponsors.length ? <ul className={styles.facts} aria-label="Fictional local sponsors">
            {property.local_sponsors.map(sponsor => <li key={sponsor.sponsor_id}>{sponsor.name}</li>)}
          </ul> : <p>No local sponsors are listed.</p>}
        </section>
      </div>
    </article>
  </main>
}
