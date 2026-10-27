import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ToolRail } from './ToolRail'

function setup(overrides: Partial<Parameters<typeof ToolRail>[0]> = {}) {
  const props = {
    activeTool: 'select' as const,
    onSelect: vi.fn(),
    onOpenLayers: vi.fn(),
    canUndo: true,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    ...overrides,
  }
  render(<ToolRail {...props} />)
  return props
}

describe('ToolRail history buttons', () => {
  it('undoes and redoes when available', async () => {
    const props = setup({ canRedo: true })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await user.click(screen.getByRole('button', { name: 'Redo' }))
    expect(props.onUndo).toHaveBeenCalledOnce()
    expect(props.onRedo).toHaveBeenCalledOnce()
  })

  it('disables a button when there is nothing to undo or redo', () => {
    setup({ canUndo: false, canRedo: false })
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
  })
})
