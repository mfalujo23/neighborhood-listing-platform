import Link from 'next/link'
import styles from '../../../components/listings.module.css'

export default function PropertyNotFound() {
  return <main className={styles.page}>
    <header className={styles.intro}>
      <h1>Property unavailable</h1>
      <p>This sample property could not be found.</p>
      <Link className={styles.detailLink} href="/listings">Back to all sample listings</Link>
    </header>
  </main>
}
