import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppErrorBoundary } from './AppErrorBoundary'

function BrokenView(): never {
  throw new Error('Test render failure')
}

describe('AppErrorBoundary', () => {
  it('presents a heading and a recovery action when rendering fails outside the router', () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      render(<AppErrorBoundary><BrokenView /></AppErrorBoundary>)

      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('The studio could not render.')
      expect(screen.getByRole('button', { name: 'Reload the demo' })).toBeEnabled()
      expect(screen.getByText(/Nothing was saved or changed/)).toBeInTheDocument()
    } finally {
      errorLog.mockRestore()
    }
  })
})
