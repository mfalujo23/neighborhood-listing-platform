// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import PropertyCard from '../components/PropertyCard'
import { PropertySchema } from '../schemas/property'
import fixtures from '../../data/generated/mfalujo23-synthetic-properties.json'

afterEach(cleanup)
it('keeps visible favorite wording within the computed accessible name in both toggle states', async () => {
  const user = userEvent.setup()
  const property = PropertySchema.parse(fixtures[0])
  render(<PropertyCard property={property} />)
  const matchingButton = () => screen.getByRole('button', { name: (name, element) => {
    const visible = element.textContent?.trim() ?? ''
    return visible.length > 0 && name.startsWith(visible) && name.includes(property.street)
  } })
  const button = matchingButton()
  expect(button.getAttribute('aria-pressed')).toBe('false')
  button.focus()
  await user.keyboard('{Enter}')
  expect(matchingButton().getAttribute('aria-pressed')).toBe('true')
  await user.keyboard(' ')
  expect(matchingButton().getAttribute('aria-pressed')).toBe('false')
})
