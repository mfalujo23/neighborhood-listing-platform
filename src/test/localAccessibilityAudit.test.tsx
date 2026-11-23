// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
const engine = vi.hoisted(() => ({ run: vi.fn() }))
vi.mock('axe-core', () => ({ default: { run: engine.run } }))
import LocalAccessibilityAudit from '../components/LocalAccessibilityAudit'

afterEach(() => { cleanup(); vi.clearAllMocks() })
describe('Visible local accessibility audit control', () => {
  it('runs only when invoked and retains selectors without raw page HTML', async () => {
    engine.run.mockResolvedValue({
      testEngine: { name: 'axe-core', version: 'synthetic-test' },
      violations: [{ id: 'test-rule', impact: 'serious', help: 'Synthetic finding', helpUrl: 'https://example.invalid/rule', nodes: [{ target: ['#example'], html: 'PRIVATE_SENTINEL' }] }],
      incomplete: [], passes: [{ id: 'pass' }],
    })
    const user = userEvent.setup()
    render(<LocalAccessibilityAudit />)
    expect(engine.run).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Run accessibility checks' }))
    expect((await screen.findByRole('status')).textContent).toContain('1 violations')
    expect(screen.getByLabelText('Accessibility audit JSON').textContent).not.toContain('PRIVATE_SENTINEL')
    expect(engine.run).toHaveBeenCalledTimes(1)
  })
  it('reports an execution failure instead of presenting a false pass', async () => {
    engine.run.mockRejectedValue(new Error('Synthetic engine failure'))
    const user = userEvent.setup()
    render(<LocalAccessibilityAudit />)
    await user.click(screen.getByRole('button', { name: 'Run accessibility checks' }))
    expect((await screen.findByRole('alert')).textContent).toContain('could not complete')
    expect(screen.queryByRole('status')).toBeNull()
  })
})
