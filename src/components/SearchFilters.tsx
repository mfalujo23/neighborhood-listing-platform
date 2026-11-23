'use client'

import { useId, useState, type FormEvent } from 'react'
import type { SearchFiltersProps } from '../types'
import styles from './listings.module.css'

export type { PropertyFilters } from '../types'

export function SearchFilters({ locations = [], onApply }: SearchFiltersProps) {
  const formId = useId()
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onApply?.({ search: search.trim(), city, maxPrice: maxPrice === '' ? null : Number(maxPrice) })
  }

  function resetFilters() {
    setSearch('')
    setCity('')
    setMaxPrice('')
    onApply?.({ search: '', city: '', maxPrice: null })
  }

  return (
    <section aria-labelledby={`${formId}-heading`} className={styles.filters}>
      <h2 id={`${formId}-heading`}>Find a synthetic listing</h2>
      <form onSubmit={applyFilters} aria-labelledby={`${formId}-heading`} className={styles.filterForm}>
        <div>
          <label htmlFor={`${formId}-search`}>Address, city or ZIP</label>
          <input id={`${formId}-search`} type="search" maxLength={160} value={search} onChange={(event) => setSearch(event.target.value)} className={styles.field} />
        </div>
        <div>
          <label htmlFor={`${formId}-city`}>City</label>
          <select id={`${formId}-city`} value={city} onChange={(event) => setCity(event.target.value)} className={styles.field}>
            <option value="">All cities</option>
            {locations.map((location) => <option key={location} value={location}>{location}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${formId}-price`}>Maximum price</label>
          <select id={`${formId}-price`} value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} className={styles.field}>
            <option value="">Any price</option>
            <option value="400000">$400,000</option>
            <option value="600000">$600,000</option>
            <option value="800000">$800,000</option>
          </select>
        </div>
        <button type="submit" className={styles.button}>Apply filters</button>
        <button type="button" onClick={resetFilters} className={styles.secondaryButton}>Reset filters</button>
      </form>
    </section>
  )
}
