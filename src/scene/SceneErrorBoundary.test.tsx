import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SceneErrorBoundary } from './SceneErrorBoundary'

function Broken(): never {
  throw new Error('composer failed')
}

describe('SceneErrorBoundary', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the WebGL notice by default', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <SceneErrorBoundary>
        <Broken />
      </SceneErrorBoundary>,
    )
    expect(screen.getByRole('heading', { name: '3D view unavailable' })).toBeInTheDocument()
    expect(screen.getByText(/stopped unexpectedly/)).toBeInTheDocument()
  })

  it('retries and restores the scene after a runtime failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let broken = true
    function Recoverable() {
      if (broken) throw new Error('context lost')
      return <p>Scene recovered</p>
    }
    render(<SceneErrorBoundary><Recoverable /></SceneErrorBoundary>)
    broken = false
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByText('Scene recovered')).toBeInTheDocument()
  })

  it('renders the fallback instead when one is given, so an optional effect drops silently', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(
      <SceneErrorBoundary fallback={null}>
        <Broken />
      </SceneErrorBoundary>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
