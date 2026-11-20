'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type { PropertyCardProps } from '../types'
import styles from './listings.module.css'

export function PropertyCard({ property }: PropertyCardProps) {
  const [saved, setSaved] = useState(false)
  const headingId = `property-${property.property_id}`

  return (
    <article aria-labelledby={headingId} className={styles.card}>
      <Image
        src="/synthetic-home.svg"
        alt={`Schematic house illustration for the synthetic listing at ${property.street}, ${property.city}`}
        width={640}
        height={360}
        className={styles.image}
      />
      <div className={styles.cardBody}>
        <p className={styles.eyebrow}>Synthetic listing</p>
        <h3 id={headingId}>{property.street}</h3>
        <p>{property.city}, {property.state} {property.zip_code}</p>
        <p className={styles.price}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(property.price)}
        </p>
        <ul aria-label={`Property facts for ${property.street}`} className={styles.facts}>
          <li>{property.bedrooms} beds</li>
          <li>{property.bathrooms} baths</li>
          <li>{property.square_feet.toLocaleString('en-US')} sq ft</li>
        </ul>
        <button
          type="button"
          aria-pressed={saved}
          aria-label={`${saved ? 'Saved to favorites' : 'Save to favorites'}: synthetic listing at ${property.street}`}
          onClick={() => setSaved((previous) => !previous)}
          className={styles.button}
        >
          {saved ? 'Saved to favorites' : 'Save to favorites'}
        </button>
        <details className={styles.details}>
          <summary>View details for {property.street}</summary>
          <p>Amenities: {property.amenities.map((amenity) => amenity.replaceAll('_', ' ')).join(', ') || 'None listed'}.</p>
          <p>Fictional local sponsors: {property.local_sponsors.map((sponsor) => sponsor.name).join(', ') || 'None'}.</p>
        </details>
        <Link href={`/listings/${encodeURIComponent(property.property_id)}`} className={styles.detailLink}>
          Full details for {property.street}
        </Link>
      </div>
    </article>
  )
}

export default PropertyCard
