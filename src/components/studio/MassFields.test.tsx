import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MassingCommand } from '../../features/editor/history'
import {
  createRectangleFootprint,
  createScenario,
  createTier,
  createVolume,
} from '../../features/massing/factories'
import { rotateRing } from '../../lib/polygon'
import { MassFields } from './MassFields'

const tier = createTier({ id: 't1', footprint: createRectangleFootprint(18, 12), storeys: 3 })
const volume = createVolume({ id: 'v1', name: 'Mass 1', tiers: [tier] })
const document = createScenario({ siteId: 'compact-infill', volumes: [volume] })

function setup(overrides: Partial<Parameters<typeof MassFields>[0]> = {}) {
  const onCommand = vi.fn<(command: MassingCommand) => string | null>(() => null)
  const user = userEvent.setup()
  render(<MassFields volume={volume} tier={tier} disabled={false} onCommand={onCommand} {...overrides} />)
  return { onCommand, user }
}

/** Applies the last command to the fixture document and returns the edited tier/volume. */
function applied(onCommand: ReturnType<typeof setup>['onCommand']) {
  const command = onCommand.mock.lastCall?.[0]
  const next = command?.apply(document)
  return { volume: next?.volumes[0], tier: next?.volumes[0]?.tiers[0] }
}

describe('MassFields', () => {
  it('shows current values with 2 dp metres and geometry-derived readouts', () => {
    setup()
    expect(screen.getByLabelText('Name')).toHaveValue('Mass 1')
    expect(screen.getByLabelText('Storeys')).toHaveValue('3')
    expect(screen.getByLabelText('Storey height')).toHaveValue('3.20')
    expect(screen.getByLabelText('Base elevation')).toHaveValue('0.00')
    expect(screen.getByText('9.6 m')).toBeInTheDocument()
    expect(screen.getByText('216 m²')).toBeInTheDocument()
  })

  it('commits a valid storey count on Enter', async () => {
    const { onCommand, user } = setup()
    await user.clear(screen.getByLabelText('Storeys'))
    await user.type(screen.getByLabelText('Storeys'), '5{Enter}')
    expect(applied(onCommand).tier?.storeys).toBe(5)
  })

  it('QA-16: rejects non-numeric input, keeps the prior value and says why', async () => {
    const { onCommand, user } = setup()
    const field = screen.getByLabelText('Storeys')
    await user.clear(field)
    await user.type(field, '-1')
    await user.tab()
    expect(onCommand).not.toHaveBeenCalled()
    expect(field).toHaveValue('3')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Enter a whole number of storeys.')).toBeInTheDocument()
  })

  it('QA-16: shows the domain error and keeps the prior value when a command is refused', async () => {
    const { user } = setup({ onCommand: () => 'Storeys must be an integer between 1 and 40.' })
    const field = screen.getByLabelText('Storeys')
    await user.clear(field)
    await user.type(field, '41{Enter}')
    expect(field).toHaveValue('3')
    expect(screen.getByText('Storeys must be an integer between 1 and 40.')).toBeInTheDocument()
  })

  it('parses metres with a comma decimal', async () => {
    const { onCommand, user } = setup()
    const height = screen.getByLabelText('Storey height')
    await user.clear(height)
    await user.type(height, '3,5{Enter}')
    expect(applied(onCommand).tier?.storeyHeight).toBe(3.5)
  })

  it('QA-16: rejects a non-number in metres', async () => {
    const { onCommand, user } = setup()
    const base = screen.getByLabelText('Base elevation')
    await user.clear(base)
    await user.type(base, 'abc{Enter}')
    expect(onCommand).not.toHaveBeenCalled()
    expect(base).toHaveValue('0.00')
    expect(screen.getByText('Enter a number in metres.')).toBeInTheDocument()
  })

  it('reverts a draft on Escape without committing', async () => {
    const { onCommand, user } = setup()
    const name = screen.getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Draft{Escape}')
    expect(name).toHaveValue('Mass 1')
    expect(onCommand).not.toHaveBeenCalled()
  })

  it('changes use, visibility and lock through commands', async () => {
    const { onCommand, user } = setup()
    await user.selectOptions(screen.getByLabelText('Use'), 'commercial')
    expect(applied(onCommand).tier?.use).toBe('commercial')
    await user.click(screen.getByLabelText('Visible'))
    expect(applied(onCommand).volume?.visible).toBe(false)
    await user.click(screen.getByLabelText('Locked'))
    expect(applied(onCommand).volume?.locked).toBe(true)
  })

  it('disables geometry fields on a locked mass but keeps name, visibility and lock', () => {
    setup({ volume: { ...volume, locked: true } })
    expect(screen.getByLabelText('Storeys')).toBeDisabled()
    expect(screen.getByLabelText('Storey height')).toBeDisabled()
    expect(screen.getByLabelText('Base elevation')).toBeDisabled()
    expect(screen.getByLabelText('Use')).toBeDisabled()
    expect(screen.getByLabelText('Name')).toBeEnabled()
    expect(screen.getByLabelText('Visible')).toBeEnabled()
    expect(screen.getByLabelText('Locked')).toBeEnabled()
  })

  it('lists clearance warnings for the mass as an illustrative check', () => {
    setup({
      warnings: [
        { kind: 'boundary-crossing', message: 'Crosses the study boundary' },
        { kind: 'cut', amount: 3.2, message: 'Cuts up to 3.2 m into the slope' },
      ],
    })
    const list = screen.getByRole('list', { name: 'Clearance warnings' })
    expect(list).toHaveTextContent('Crosses the study boundary')
    expect(list).toHaveTextContent('Cuts up to 3.2 m into the slope')
    expect(screen.getByText(/Illustrative check/)).toBeInTheDocument()
  })

  it('shows no warning list when the mass is clear', () => {
    setup()
    expect(screen.queryByRole('list', { name: 'Clearance warnings' })).not.toBeInTheDocument()
  })

  it('duplicates the mass beside the original', async () => {
    const { onCommand, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Duplicate' }))
    const next = onCommand.mock.lastCall?.[0].apply(document)
    expect(next?.volumes).toHaveLength(2)
    // 18 m wide, so the copy shifts 18 + 5 m east.
    expect(next?.volumes[1]?.tiers[0]?.footprint.vertices[0]).toEqual([14, -6])
  })

  it('deletes the mass', async () => {
    const { onCommand, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onCommand.mock.lastCall?.[0].apply(document).volumes).toHaveLength(0)
  })

  it('rotates by 15° steps (clockwise is negative in ENU)', async () => {
    const { onCommand, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Rotate 15° clockwise' }))
    const vertices = applied(onCommand).tier?.footprint.vertices ?? []
    const expected = rotateRing(tier.footprint.vertices, -Math.PI / 12, [0, 0])
    vertices.forEach((vertex, index) => {
      expect(vertex[0]).toBeCloseTo(expected[index]?.[0] ?? Number.NaN, 9)
      expect(vertex[1]).toBeCloseTo(expected[index]?.[1] ?? Number.NaN, 9)
    })
    await user.click(screen.getByRole('button', { name: 'Rotate 15° counter-clockwise' }))
    expect(applied(onCommand).tier?.footprint.vertices[0]?.[0]).toBeCloseTo(
      rotateRing(tier.footprint.vertices, Math.PI / 12, [0, 0])[0]?.[0] ?? Number.NaN,
      9,
    )
  })

  it('keeps duplicate available on a locked mass but not rotate or delete', () => {
    setup({ volume: { ...volume, locked: true } })
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Rotate 15° clockwise' })).toBeDisabled()
  })

  it('disables everything when editing is off', () => {
    setup({ disabled: true })
    for (const label of ['Name', 'Storeys', 'Storey height', 'Base elevation', 'Use', 'Visible', 'Locked']) {
      expect(screen.getByLabelText(label)).toBeDisabled()
    }
  })
})
