// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import PropertyCard from '../components/PropertyCard'
import ListingsExplorer from '../components/ListingsExplorer'
import ImaginaryGardenShopPage from '../app/listings/sponsors/imaginary-garden-shop/page'
import { PropertyCollectionSchema } from '../schemas/property'
import rawProperties from '../../data/generated/gemini-ai-studio-seed-attempt2.json'

const properties = PropertyCollectionSchema.parse(rawProperties)
afterEach(cleanup)

it('exposes property facts as a list within its labelled article', () => {
  const property = properties[0]
  render(<PropertyCard property={property} />)
  const article = screen.getByRole('article', { name: property.street })
  const facts = within(article).getByRole('list', { name: `Property facts for ${property.street}` })
  expect(within(facts).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    `${property.bedrooms} beds`, `${property.bathrooms} baths`,
    `${property.square_feet.toLocaleString('en-US')} sq ft`,
  ])
  expect(within(article).getByRole('img').getAttribute('alt')).toContain(property.street)
})

it('places the named local sponsor link after filter controls in the keyboard order', async () => {
  const user = userEvent.setup()
  render(<ListingsExplorer properties={properties} />)
  const link = screen.getByRole('link', { name: 'About Imaginary Garden Shop' })
  expect(link.getAttribute('href')).toBe('/listings/sponsors/imaginary-garden-shop')
  for (const control of [
    screen.getByRole('combobox', { name: 'City' }),
    screen.getByRole('combobox', { name: 'Maximum price' }),
    screen.getByRole('button', { name: 'Apply filters' }),
    screen.getByRole('button', { name: 'Reset filters' }),
    link,
  ]) {
    await user.tab()
    expect(document.activeElement).toBe(control)
  }
  await user.tab({ shift: true })
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Reset filters' }))
})

it('preserves empty-state and reset behavior with the validated five-record data', async () => {
  const user = userEvent.setup()
  render(<ListingsExplorer properties={properties} />)
  await user.selectOptions(screen.getByRole('combobox', { name: 'City' }), 'Demo Grove')
  await user.selectOptions(screen.getByRole('combobox', { name: 'Maximum price' }), '400000')
  await user.click(screen.getByRole('button', { name: 'Apply filters' }))
  expect(screen.queryAllByRole('article')).toHaveLength(0)
  expect(screen.getByText(/No listings match these filters/)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Reset filters' }))
  expect(screen.getAllByRole('article')).toHaveLength(properties.length)
})

it('provides the local destination with the same sponsor name and a return route', () => {
  render(<ImaginaryGardenShopPage />)
  expect(screen.getByRole('heading', { level: 1, name: 'Imaginary Garden Shop' })).toBeTruthy()
  expect(screen.getByText(/fictional classroom sponsor/)).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Back to listings' }).getAttribute('href')).toBe('/listings')
})

it('keeps expanded details open when keyboard favorite toggles rerender the card', async () => {
  const user = userEvent.setup()
  const property = properties[0]
  render(<PropertyCard property={property} />)
  const summary = screen.getByText(`View details for ${property.street}`)
  await user.click(summary)
  const details = summary.closest('details')
  expect(details?.open).toBe(true)
  const favorite = screen.getByRole('button', { name: `Save to favorites: synthetic listing at ${property.street}` })
  favorite.focus()
  await user.keyboard('{Enter}')
  expect(favorite.getAttribute('aria-pressed')).toBe('true')
  expect(details?.open).toBe(true)
  await user.keyboard(' ')
  expect(favorite.getAttribute('aria-pressed')).toBe('false')
  expect(details?.open).toBe(true)
})
