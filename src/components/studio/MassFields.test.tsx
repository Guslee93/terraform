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
import { MassFields } from './MassFields'

const tier = createTier({ id: 't1', footprint: createRectangleFootprint(18, 12), storeys: 3 })
const volume = createVolume({ id: 'v1', name: 'Mass 1', tiers: [tier] })
const document = createScenario({ siteId: 'compact-infill', volumes: [volume] })

function setup(overrides: Partial<Parameters<typeof MassFields>[0]> = {}) {
  const onCommand = vi.fn<(command: MassingCommand) => string | null>(() => null)
  const user = userEvent.setup()
  render(
    <MassFields
      volume={volume}
      tier={tier}
      disabled={false}
      onCommand={onCommand}
      {...overrides}
    />,
  )
  return { onCommand, user }
}

/** Applies the last command to the fixture document and returns the edited tier/volume. */
function applied(onCommand: ReturnType<typeof setup>['onCommand']) {
  const command = onCommand.mock.lastCall?.[0]
  const next = command?.apply(document)
  return { volume: next?.volumes[0], tier: next?.volumes[0]?.tiers[0] }
}

describe('MassFields', () => {
  it('shows only storeys, derived height and delete', () => {
    setup()
    expect(screen.getByRole('spinbutton', { name: 'Storeys' })).toHaveValue(3)
    expect(screen.getByText('Height · 9.6 m')).toBeVisible()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
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
    expect(field).toHaveValue(3)
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription('Enter a positive whole number of storeys.')
    expect(screen.getByText('Enter a positive whole number of storeys.')).toBeInTheDocument()
  })

  it('QA-16: shows the domain error and keeps the prior value when a command is refused', async () => {
    const { user } = setup({ onCommand: () => 'Storeys must be an integer between 1 and 40.' })
    const field = screen.getByLabelText('Storeys')
    await user.clear(field)
    await user.type(field, '41{Enter}')
    expect(field).toHaveValue(3)
    expect(screen.getByText('Storeys must be an integer between 1 and 40.')).toBeInTheDocument()
  })

  it('reverts storeys on Escape without committing', async () => {
    const { onCommand, user } = setup()
    const field = screen.getByLabelText('Storeys')
    await user.clear(field)
    await user.type(field, '8{Escape}')
    await user.tab()
    expect(field).toHaveValue(3)
    expect(onCommand).not.toHaveBeenCalled()
  })

  it('deletes the mass', async () => {
    const { onCommand, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onCommand.mock.lastCall?.[0].apply(document).volumes).toHaveLength(0)
  })

  it('disables editing during gestures', () => {
    setup({ disabled: true })
    expect(screen.getByLabelText('Storeys')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
  })
})
