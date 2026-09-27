import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FilterChip } from '@/components/ui/FilterChip'

describe('FilterChip', () => {
  it('is a toggle button with aria-pressed', () => {
    render(
      <>
        <FilterChip selected count={7}>
          все
        </FilterChip>
        <FilterChip selected={false}>новинки</FilterChip>
      </>,
    )
    expect(screen.getByRole('button', { name: 'все 7' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'новинки' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
  })

  it('is a link with aria-current when it has href', () => {
    render(
      <FilterChip href="/works" selected>
        комплекс
      </FilterChip>,
    )
    const link = screen.getByRole('link', { name: 'комплекс' })
    expect(link.getAttribute('aria-current')).toBe('page')
    expect(link.hasAttribute('aria-pressed')).toBe(false)
  })
})
