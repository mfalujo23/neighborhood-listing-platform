'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { PropertyListing } from '../schemas/property'
import styles from './listings.module.css'

interface PropertyCardProps {
  property: PropertyListing
}

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
        <p>{property.bedrooms} beds · {property.bathrooms} baths · {property.square_feet.toLocaleString('en-US')} sq ft</p>
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
      </div>
    </article>
  )
}

export default PropertyCard
