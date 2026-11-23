// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardFilters from '../analytics/DashboardFilters'
import { aggregateAnalytics } from '../analytics/metrics'
import type { DashboardFilterState } from '../analytics/dashboard-state'

const filter = { from: '2026-11-17', through: '2026-11-18' }
const initial: DashboardFilterState = { summary: aggregateAnalytics([], filter), filter, error: null }
const propertyId = '22222222-2222-4222-8222-222222222222'
afterEach(cleanup)
const setup = (action = vi.fn().mockResolvedValue(initial), state = initial) => {
  render(<DashboardFilters initialState={state} initialFilter={filter} filterAction={action} />)
  return action
}
describe('Protected dashboard form with a mocked server action', () => {
  it('has labeled native dates and optional property input in keyboard order', async () => {
    setup()
    const user = userEvent.setup()
    for (const label of ['From (UTC)', 'Through (UTC, inclusive)', 'Property ID (optional)']) {
      await user.tab()
      expect(document.activeElement).toBe(screen.getByLabelText(label))
    }
    await user.tab(); expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Apply filters' }))
    expect((screen.getByLabelText('From (UTC)') as HTMLInputElement).type).toBe('date')
    expect((screen.getByLabelText('Through (UTC, inclusive)') as HTMLInputElement).required).toBe(true)
    expect((screen.getByLabelText('Property ID (optional)') as HTMLInputElement).required).toBe(false)
    expect(screen.getByRole('form', { name: 'Filter dashboard' })).toBeTruthy()
  })
  it('sends date and property fields as FormData, preserves values, and does not change the URL', async () => {
    const nextFilter = { from: '2026-11-16', through: '2026-11-19', propertyId }
    const next: DashboardFilterState = { summary: aggregateAnalytics([], nextFilter), filter: nextFilter, error: null }
    const action = setup(vi.fn().mockResolvedValue(next))
    const url = window.location.href
    fireEvent.change(screen.getByLabelText('From (UTC)'), { target: { value: nextFilter.from } })
    fireEvent.change(screen.getByLabelText('Through (UTC, inclusive)'), { target: { value: nextFilter.through } })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Property ID (optional)'), propertyId)
    await user.keyboard('{Enter}')
    await screen.findByText(`2026-11-16 through 2026-11-19, UTC. Property: ${propertyId}.`)
    expect(action).toHaveBeenCalledOnce()
    expect(Object.fromEntries(action.mock.calls[0][1].entries())).toEqual(nextFilter)
    expect(window.location.href).toBe(url)
    expect((screen.getByLabelText('From (UTC)') as HTMLInputElement).value).toBe(nextFilter.from)
    expect((screen.getByLabelText('Property ID (optional)') as HTMLInputElement).value).toBe(propertyId)
    expect(screen.getByText('No events in this window.')).toBeTruthy()
  })
  it('disables controls and hides old metrics while a request is pending', async () => {
    let resolve!: (result: DashboardFilterState) => void
    const action = setup(vi.fn().mockReturnValue(new Promise<DashboardFilterState>(done => { resolve = done })))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))
    expect(screen.getByRole('status').textContent).toBe('Loading dashboard results…')
    expect((screen.getByLabelText('From (UTC)') as HTMLInputElement).disabled).toBe(true)
    expect(screen.queryByRole('heading', { name: 'Dashboard results' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Loading…' }))
    expect(action).toHaveBeenCalledOnce()
    resolve(initial)
    await screen.findByRole('heading', { name: 'Dashboard results' })
  })
  it('focuses a server validation error, hides stale metrics and allows a corrected retry', async () => {
    const action = setup(vi.fn().mockResolvedValueOnce({ summary: null, filter: null, error: 'Enter real dates in order and a valid property ID, or leave the property ID blank.' }).mockResolvedValue(initial))
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Property ID (optional)'), 'invalid')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))
    const alert = await screen.findByRole('alert')
    await waitFor(() => expect(document.activeElement).toBe(alert))
    expect(screen.queryByRole('heading', { name: 'Dashboard results' })).toBeNull()
    await user.clear(screen.getByLabelText('Property ID (optional)'))
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))
    await screen.findByRole('heading', { name: 'Dashboard results' })
    expect(action.mock.calls[1][1].get('propertyId')).toBe('')
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('handles a failed action transport without revealing its detail or old metrics', async () => {
    setup(vi.fn().mockRejectedValue(new Error('private transport detail')))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Apply filters' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Please try again.')
    expect(alert.textContent).not.toContain('private transport')
    expect(screen.queryByRole('heading', { name: 'Dashboard results' })).toBeNull()
    expect((screen.getByRole('button', { name: 'Apply filters' }) as HTMLButtonElement).disabled).toBe(false)
  })
  it('keeps filters available after an initial read failure', async () => {
    setup(vi.fn().mockResolvedValue(initial), { summary: null, filter: null, error: 'Analytics could not be loaded.' })
    expect(screen.getByRole('alert').textContent).toBe('Analytics could not be loaded.')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Apply filters' }))
    await screen.findByRole('heading', { name: 'Dashboard results' })
  })
})
