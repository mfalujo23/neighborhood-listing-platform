'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadPublicListings } from '../../../lib/publicListings'
import type { PublicListing } from '../../../schemas/listing'
import styles from './live-listings.module.css'

type LoadState = { status: 'loading' } | { status: 'error' } | {
  status: 'ready'; listings: PublicListing[]
}
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export default function LiveListings() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const timeout = setTimeout(() => {
      if (active) { controller.abort(); setState({ status: 'error' }) }
    }, 10000)
    loadPublicListings(controller.signal).then(listings => {
      if (active && !controller.signal.aborted) setState({ status: 'ready', listings })
    }).catch(() => {
      if (active && !controller.signal.aborted) setState({ status: 'error' })
    }).finally(() => clearTimeout(timeout))
    return () => { active = false; clearTimeout(timeout); controller.abort() }
  }, [attempt])

  function retry() { setState({ status: 'loading' }); setAttempt(value => value + 1) }

  return <main className={styles.page}>
    <nav className={styles.links} aria-label="Listing navigation">
      <Link href="/">Home</Link><Link href="/listings">Sample neighborhood</Link>
    </nav>
    <header className={styles.intro}>
      <h1>Example listings</h1>
      <p>These approved fictional properties are examples for demonstration.</p>
    </header>
    <section aria-labelledby="available-listings" aria-busy={state.status === 'loading'}>
      <h2 id="available-listings">Available properties</h2>
      {state.status === 'loading' && <p role="status">Loading listings…</p>}
      {state.status === 'error' && <div className={styles.message}>
        <p role="alert">Listings could not be loaded. Please try again.</p>
        <button className={styles.button} onClick={retry}>Retry loading listings</button>
      </div>}
      {state.status === 'ready' && state.listings.length === 0 && <div className={styles.message}>
        <p role="status">No approved example listings are available right now.</p>
        <button className={styles.button} onClick={retry}>Check listings again</button>
      </div>}
      {state.status === 'ready' && state.listings.length > 0 && <div className={styles.grid}>
        {state.listings.map(listing => <article key={listing.id} className={styles.card}>
          <header><h3>{listing.title}</h3></header>
          <p>{listing.street}<br />{listing.city}, {listing.state} {listing.zip_code}</p>
          <ul className={styles.facts}>
            <li>Price: {money.format(listing.price)}</li>
            <li>Bedrooms: {listing.bedrooms}</li>
            <li>Bathrooms: {listing.bathrooms}</li>
            <li>Size: {listing.square_feet.toLocaleString('en-US')} square feet</li>
          </ul>
          {listing.description && <p>{listing.description}</p>}
          {listing.amenities.length > 0 && <><h4>Features</h4>
            <ul>{listing.amenities.map((amenity, index) => <li key={index}>{amenity}</li>)}</ul>
          </>}
        </article>)}
      </div>}
    </section>
  </main>
}
