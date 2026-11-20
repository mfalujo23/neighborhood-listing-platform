import Link from 'next/link'
import styles from '../../../../components/listings.module.css'

export default function ImaginaryGardenShopPage() {
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Sponsored · Fictional classroom example</p>
        <h1>Imaginary Garden Shop</h1>
        <p>This is a fictional classroom sponsor. No business paid for this example.</p>
        <Link href="/listings">Back to listings</Link>
      </header>
    </main>
  )
}
