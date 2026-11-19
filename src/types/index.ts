import type { PropertyListing } from '../schemas/property'

export type { PropertyListing } from '../schemas/property'
export type Property = PropertyListing
export type Sponsor = Property['local_sponsors'][number]

export interface PropertyCardProps {
  property: Property
}

export interface SponsorBannerProps {
  propertyId: Property['property_id']
  targetZip: Property['zip_code']
  placement?: string
  pageContext?: 'home' | 'property_detail' | 'services'
}

export interface PropertyFilters {
  city: string
  maxPrice: number | null
}

export interface SearchFiltersProps {
  locations?: readonly string[]
  onApply?: (filters: PropertyFilters) => void
}
