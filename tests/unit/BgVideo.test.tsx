import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BgVideo } from '@/components/ui/BgVideo'
import { env, intersect } from './setup'
import { photo, video } from './fixtures'

const sizes = { base: '100vw' }

describe('BgVideo', () => {
  it('always renders the poster', () => {
    render(<BgVideo poster={photo} sizes={sizes} />)
    expect(screen.getByRole('img').getAttribute('alt')).toBe('Светлая кухня с белыми фасадами')
    expect(document.querySelector('video')).toBeNull()
  })

  it('mounts a muted looping inline video with the MIME type from Media', () => {
    const { container } = render(<BgVideo poster={photo} video={video} sizes={sizes} priority />)
    const el = container.querySelector('video')!
    expect(el).not.toBeNull()
    expect(el.muted).toBe(true)
    expect(el.hasAttribute('muted')).toBe(true)
    expect(el.loop).toBe(true)
    expect(el.hasAttribute('playsinline')).toBe(true)
    expect(el.hasAttribute('controls')).toBe(false)
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.getAttribute('preload')).toBe('auto')
    const source = el.querySelector('source')!
    expect(source.getAttribute('src')).toBe('/api/media/file/hero.mp4')
    expect(source.getAttribute('type')).toBe('video/mp4')
    expect(screen.getByRole('img')).toBeTruthy()
  })

  it('does not mount the video with reduced motion', () => {
    env.reducedMotion = true
    const { container } = render(<BgVideo poster={photo} video={video} sizes={sizes} priority />)
    expect(container.querySelector('video')).toBeNull()
    expect(screen.getByRole('img')).toBeTruthy()
  })

  it('does not mount the video with Save-Data', () => {
    env.saveData = true
    const { container } = render(<BgVideo poster={photo} video={video} sizes={sizes} priority />)
    expect(container.querySelector('video')).toBeNull()
  })

  it('mounts below-the-fold video near the viewport and pauses it outside', () => {
    const { container } = render(<BgVideo poster={photo} video={video} sizes={sizes} />)
    expect(container.querySelector('video')).toBeNull()
    act(() => intersect(true))
    const el = container.querySelector('video')!
    expect(el.getAttribute('preload')).toBe('metadata')
    act(() => intersect(false))
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  })

  it('keeps the poster when autoplay is refused', async () => {
    HTMLMediaElement.prototype.play = vi.fn(() => Promise.reject(new Error('NotAllowedError')))
    const { container } = render(<BgVideo poster={photo} video={video} sizes={sizes} priority />)
    await act(async () => intersect(true))
    expect(container.querySelector('video')).toBeNull()
    expect(screen.getByRole('img')).toBeTruthy()
  })

  it('shows the video only once it plays', () => {
    const { container } = render(<BgVideo poster={photo} video={video} sizes={sizes} priority />)
    const el = container.querySelector('video')!
    expect(el.className).toContain('opacity-0')
    act(() => {
      el.dispatchEvent(new Event('playing'))
    })
    expect(el.className).toContain('opacity-100')
  })
})
