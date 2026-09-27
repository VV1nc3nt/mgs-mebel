import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { IconButton } from '@/components/ui/IconButton'
import { MediaCard } from '@/components/ui/MediaCard'
import { photo } from './fixtures'

const sizes = { base: '100vw', xl: '33vw' }

describe('MediaCard', () => {
  it('renders the image with alt from Media', () => {
    render(<MediaCard media={photo} sizes={sizes} overlay="card" />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('alt')).toBe('Светлая кухня с белыми фасадами')
    expect(img.getAttribute('sizes')).toBe('(min-width: 1280px) 33vw, 100vw')
  })

  it('degrades to an empty surface without media', () => {
    const { container } = render(<MediaCard media={null} sizes={sizes} />)
    expect(container.querySelector('img')).toBeNull()
    render(<MediaCard media={5} sizes={sizes} />)
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('becomes a link with href', () => {
    render(
      <MediaCard media={photo} sizes={sizes} href="/news/artdom-2026">
        <h3>Выставка ARTDOM 2026</h3>
      </MediaCard>,
    )
    expect(screen.getByRole('link').getAttribute('href')).toBe('/news/artdom-2026')
  })

  it('is not a nameless link without media and content', () => {
    render(<MediaCard media={null} sizes={sizes} href="/works" />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('keeps slot buttons outside the clipping layer', () => {
    render(
      <MediaCard
        media={photo}
        sizes={sizes}
        top={
          <IconButton aria-label="Закрыть" size={36}>
            <svg />
          </IconButton>
        }
      />,
    )
    let node = screen.getByRole('button').parentElement
    while (node) {
      expect(node.className).not.toContain('overflow-hidden')
      node = node.parentElement
    }
  })
})
