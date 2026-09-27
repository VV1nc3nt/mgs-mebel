import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SectionLabel } from '@/components/ui/SectionLabel'

describe('SectionLabel', () => {
  it('adds a decorative «#» to the CMS label and is not a heading', () => {
    const { container } = render(<SectionLabel>о нас</SectionLabel>)
    const hash = screen.getByText('#')
    expect(hash.getAttribute('aria-hidden')).toBe('true')
    expect(container.textContent).toBe('#о нас')
    expect(screen.queryByRole('heading')).toBeNull()
  })
})
