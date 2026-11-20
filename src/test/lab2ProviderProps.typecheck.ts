import type { Property, PropertyFilters, PropertyCardProps as ActualPropertyCardProps, SponsorBannerProps as ActualSponsorBannerProps, SearchFiltersProps as ActualSearchFiltersProps } from '../types'

export interface PropertyCardProps {
  property: Property;
}

export interface SponsorBannerProps {
  propertyId: Property['property_id'];
  targetZip: Property['zip_code'];
  placement?: string;
  pageContext?: 'home' | 'property_detail' | 'services';
}

export interface SearchFiltersProps {
  locations?: readonly string[];
  onFilterChange?: (filters: PropertyFilters) => void;
}

type Assert<T extends true> = T
type Equivalent<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type AdaptedSearchFiltersProps = Pick<SearchFiltersProps, 'locations'> & { onApply?: SearchFiltersProps['onFilterChange'] }

export type CheckedProviderPropContracts = [
  Assert<Equivalent<PropertyCardProps, ActualPropertyCardProps>>,
  Assert<Equivalent<SponsorBannerProps, ActualSponsorBannerProps>>,
  Assert<Equivalent<AdaptedSearchFiltersProps, ActualSearchFiltersProps>>,
]
