export type DemoProperty = {
  id: string;
  title: string;
  address: string;
  zip: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  features: string[];
  publicationStatus: 'approved-in-fictional-fixture';
};

// Entirely fictional teaching data. "Approved" describes this mock's fixture
// state; it is not evidence of an instructor, client, or stakeholder approval.
export const demoProperties: DemoProperty[] = [
  {
    id: 'demo-001', title: 'Cedar Court Demo Home',
    address: '101 Example Court, Demo City, CA 90032', zip: '90032',
    price: 625000, bedrooms: 2, bathrooms: 1,
    features: ['Step-free entry in this fictional example', 'Sample courtyard'],
    publicationStatus: 'approved-in-fictional-fixture',
  },
  {
    id: 'demo-002', title: 'Maple Lane Demo Home',
    address: '202 Sample Lane, Demo City, CA 90032', zip: '90032',
    price: 710000, bedrooms: 3, bathrooms: 2,
    features: ['Sample balcony'], publicationStatus: 'approved-in-fictional-fixture',
  },
];

export const sponsorCategories = ['food', 'home-services', 'retail'] as const;
export type SponsorCategory = typeof sponsorCategories[number];
export type DemoSponsor = {
  id: string;
  name: string;
  zip: string;
  category: SponsorCategory;
  approvedText: string;
  sponsored: true;
};

export const demoSponsors: DemoSponsor[] = [
  {
    id: 'sponsor-demo-001', name: 'Demo Corner Cafe', zip: '90032', category: 'food',
    approvedText: 'Fictional cafe used only to demonstrate a sponsored placement.', sponsored: true,
  },
  {
    id: 'sponsor-demo-002', name: 'Example Home Repairs', zip: '90032', category: 'home-services',
    approvedText: 'Fictional repair business; no price, quality, or availability promise.', sponsored: true,
  },
];

export const FACTS_VERSION = 'fictional-facts-v1.0.0';
