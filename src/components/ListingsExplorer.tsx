'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Property } from '../types'
import PropertyCard from './PropertyCard'
import { SearchFilters, type PropertyFilters } from './SearchFilters'
import styles from './listings.module.css'

export default function ListingsExplorer({ properties }: { properties: Property[] }) {
  const [filters, setFilters] = useState<PropertyFilters>({ search: '', city: '', maxPrice: null })
  const locations = [...new Set(properties.map((property) => property.city))].sort()
  const searchTerms = filters.search.toLowerCase().split(/\s+/).filter(Boolean)
  const visible = properties.filter((property) =>
    searchTerms.every((term) => `${property.street} ${property.city} ${property.state} ${property.zip_code}`.toLowerCase().includes(term)) &&
    (!filters.city || property.city === filters.city) &&
    (filters.maxPrice === null || property.price <= filters.maxPrice),
  )

  return (
    <>
      <SearchFilters locations={locations} onApply={setFilters} />
      <aside aria-labelledby="demo-sponsor-heading" className={styles.sponsor}>
        <p className={styles.eyebrow}>Sponsored · Synthetic example</p>
        <h2 id="demo-sponsor-heading">Imaginary Garden Shop</h2>
        <p>A sample gardening sponsor shown beside the property listings. Products, services and opening hours are not provided.</p>
        <Link href="/listings/sponsors/imaginary-garden-shop" className={styles.sponsorLink}>
          About Imaginary Garden Shop
        </Link>
        <details className={styles.details}>
          <summary>About this sample sponsorship</summary>
          <p>No business paid for this example. The link opens a local fictional sponsor page.</p>
        </details>
      </aside>
      <section id="listing-results" aria-labelledby="listings-heading" className={styles.results}>
        <h2 id="listings-heading">Synthetic property listings</h2>
        <p role="status" aria-live="polite">{visible.length} of {properties.length} listings shown.</p>
        <p className={styles.note}>Saved choices reset when this page reloads.</p>
        {visible.length === 0 ? (
          <p className={styles.empty}>No listings match these filters. Try another search, city or price, or reset the filters.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((property) => <PropertyCard key={property.property_id} property={property} />)}
          </div>
        )}
      </section>
    </>
  )
}
