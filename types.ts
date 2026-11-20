// Import the canonical runtime-derived type instead of maintaining a second shape.
export type { PropertyListing as Property } from './src/schemas/property';

export interface Sponsor {
  name: string;
  description: string;
  link: string;
}
