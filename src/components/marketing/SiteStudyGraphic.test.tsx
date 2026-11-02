import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SiteStudyGraphic } from './SiteStudyGraphic'

describe('SiteStudyGraphic', () => {
  it('keeps the decorative study out of the accessibility tree and keyboard order', () => {
    const { container } = render(<SiteStudyGraphic />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('svg')).toHaveAttribute('focusable', 'false')
    expect(container.querySelector('[tabindex]')).toBeNull()
  })
})
