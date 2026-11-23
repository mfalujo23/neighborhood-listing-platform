// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import rawProperties from '../../data/generated/gemini-ai-studio-seed-attempt2.json'
import { PropertyCollectionSchema } from '../schemas/property'
import { findSyntheticProperty } from '../lib/syntheticProperties'
import * as syntheticProperties from '../lib/syntheticProperties'
import PropertyDetailPage, { generateStaticParams } from '../app/listings/[propertyId]/page'
import PropertyNotFound from '../app/listings/[propertyId]/not-found'
import PropertyCard from '../components/PropertyCard'

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404') },
}))
const properties = PropertyCollectionSchema.parse(rawProperties)
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it.each(properties)('renders validated details for $street', async property => {
  render(await PropertyDetailPage({ params: Promise.resolve({ propertyId: property.property_id }) }))
  expect(screen.getByRole('heading', { level: 1, name: property.street })).toBeTruthy()
  const facts = screen.getByRole('list', { name: 'Property facts' })
  expect(within(facts).getByText(`Bedrooms: ${property.bedrooms}`)).toBeTruthy()
  expect(within(facts).getByText(`Bathrooms: ${property.bathrooms}`)).toBeTruthy()
  expect(within(facts).getByText(`ZIP code: ${property.zip_code}`)).toBeTruthy()
  expect(screen.getByText('This fictional classroom property is not a real offer.')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Back to all sample listings' }).getAttribute('href')).toBe('/listings')
  expect(screen.getByRole('article').textContent).not.toContain('undefined')
})

it.each(['not-a-uuid', '../private', '%2F', '', '99999999-9999-4999-8999-999999999999'])(
  'rejects an invalid or unknown route ID without reflecting it: %s', async propertyId => {
    await expect(PropertyDetailPage({ params: Promise.resolve({ propertyId }) })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
  },
)

it('fails closed when any generated record fails the canonical contract', () => {
  const invalid = structuredClone(rawProperties)
  invalid[1].price = -1
  expect(findSyntheticProperty(properties[0].property_id, invalid)).toBeUndefined()
  expect(findSyntheticProperty(properties[0].property_id, [])).toBeUndefined()
  expect(findSyntheticProperty(123)).toBeUndefined()
})

it('generates routes only for the five validated fixture IDs', () => {
  expect(generateStaticParams()).toEqual(properties.map(property => ({ propertyId: property.property_id })))
})

it('shows explicit empty feature and sponsor states without inventing content', async () => {
  vi.spyOn(syntheticProperties, 'findSyntheticProperty').mockReturnValue({ ...properties[0], amenities: [], local_sponsors: [] })
  render(await PropertyDetailPage({ params: Promise.resolve({ propertyId: properties[0].property_id }) }))
  expect(screen.getByText('No amenities are listed.')).toBeTruthy()
  expect(screen.getByText('No local sponsors are listed.')).toBeTruthy()
  expect(screen.queryByRole('list', { name: 'Features' })).toBeNull()
  expect(screen.queryByRole('list', { name: 'Fictional local sponsors' })).toBeNull()
})

it('renders contract-valid text as text rather than injected markup', async () => {
  const street = '<img src=x onerror=alert(1)>'
  vi.spyOn(syntheticProperties, 'findSyntheticProperty').mockReturnValue({ ...properties[0], street })
  render(await PropertyDetailPage({ params: Promise.resolve({ propertyId: properties[0].property_id }) }))
  expect(screen.getByRole('heading', { level: 1, name: street })).toBeTruthy()
  expect(document.querySelector('img[onerror]')).toBeNull()
})

it('keeps the full-page link separate and keyboard reachable without changing Save or expanded details', async () => {
  const user = userEvent.setup()
  const property = properties[0]
  render(<PropertyCard property={property} />)
  const summary = screen.getByText(`View details for ${property.street}`)
  await user.click(summary)
  expect(summary.closest('details')?.open).toBe(true)
  const link = screen.getByRole('link', { name: `Full details for ${property.street}` })
  expect(link.getAttribute('href')).toBe(`/listings/${property.property_id}`)
  expect(link.querySelector('button, summary, input')).toBeNull()
  summary.focus()
  await user.tab()
  expect(document.activeElement).toBe(link)
  await user.tab({ shift: true })
  expect(document.activeElement).toBe(summary)
  const save = screen.getByRole('button', { name: `Save to favorites: synthetic listing at ${property.street}` })
  save.focus()
  await user.keyboard('{Enter}')
  expect(save.getAttribute('aria-pressed')).toBe('true')
  expect(summary.closest('details')?.open).toBe(true)
})

it('offers a fixed return route and generic unavailable text', () => {
  render(<PropertyNotFound />)
  expect(screen.getByRole('heading', { level: 1, name: 'Property unavailable' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Back to all sample listings' }).getAttribute('href')).toBe('/listings')
  expect(document.body.textContent).not.toContain('99999999')
})
