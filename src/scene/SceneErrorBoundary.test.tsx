import { render, screen } from '@testing-library/react'
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
    expect(screen.getByText('WebGL could not start.')).toBeInTheDocument()
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
