import type { Metadata } from 'next'
import LiveListings from './live-listings'

export const metadata: Metadata = {
  title: 'Example listings | BarrioList',
  description: 'Browse approved fictional property examples.',
}

export default function ExampleListingsPage() {
  return <LiveListings />
}
