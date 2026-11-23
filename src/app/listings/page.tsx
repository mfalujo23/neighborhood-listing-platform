import Link from 'next/link'
import rawFixtures from '../../../data/generated/gemini-ai-studio-seed-attempt2.json'
import ListingsExplorer from '../../components/ListingsExplorer'
import styles from '../../components/listings.module.css'
import { validatePropertyCollection } from '../../schemas/property'

export default function ListingsPage() {
  // Treat imported/generated JSON as untrusted data at the rendering boundary.
  const result = validatePropertyCollection(rawFixtures)

  return (
    <main className={styles.page}>
      <a href="#listing-results" className={styles.skipLink}>Skip to listing results</a>
      <header className={styles.intro}>
        <Link href="/">Back to BarrioList</Link>
        <h1>Explore the synthetic neighborhood</h1>
        <p>These five invented property records and sponsor names are classroom examples, not real offers or recommendations.</p>
        <p><Link href="/listings/live">Browse approved example listings</Link></p>
      </header>
      {result.success ? (
        <ListingsExplorer properties={result.data} />
      ) : (
        <section id="listing-results" aria-labelledby="listing-error-heading" className={styles.error}>
          <h2 id="listing-error-heading">Listings unavailable</h2>
          <p>The demo data did not pass validation. No unvalidated listing has been displayed.</p>
        </section>
      )}
    </main>
  )
}
