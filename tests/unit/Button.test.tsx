import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Button } from '@/components/ui/Button'

describe('Button', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('renders <button type="button"> without href', () => {
    render(<Button>Рассчитать проект</Button>)
    expect(screen.getByRole('button', { name: 'Рассчитать проект' }).getAttribute('type')).toBe(
      'button',
    )
  })

  it('opens external links in a new tab with rel="noopener noreferrer"', () => {
    render(<Button href="https://t.me/mgsmebel_official">Telegram</Button>)
    const link = screen.getByRole('link', { name: 'Telegram' })
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('keeps internal, own-domain and tel: links in the same tab', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://mgsmebel.ru')
    render(
      <>
        <Button href="/works">Смотреть все работы</Button>
        <Button href="https://mgsmebel.ru/news?type=new">Новости</Button>
        <Button href="tel:88001001658">8 800 100-16-58</Button>
      </>,
    )
    const internal = screen.getByRole('link', { name: 'Смотреть все работы' })
    const own = screen.getByRole('link', { name: 'Новости' })
    const tel = screen.getByRole('link', { name: '8 800 100-16-58' })
    expect(internal.getAttribute('href')).toBe('/works')
    expect(own.getAttribute('href')).toBe('/news?type=new')
    expect(tel.getAttribute('href')).toBe('tel:88001001658')
    for (const link of [internal, own, tel]) expect(link.hasAttribute('target')).toBe(false)
  })

  it('disables buttons and links', () => {
    render(
      <>
        <Button disabled>Рассчитать проект</Button>
        <Button href="/works" disabled>
          Показать ещё
        </Button>
      </>,
    )
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true)
    const link = screen.getByRole('link', { name: 'Показать ещё' })
    expect(link.hasAttribute('href')).toBe(false)
    expect(link.getAttribute('aria-disabled')).toBe('true')
    expect(link.getAttribute('tabindex')).toBe('-1')
  })

  it('hides the arrow and the icon from screen readers', () => {
    render(
      <Button arrow icon={<svg />}>
        PDF
      </Button>,
    )
    expect(screen.getByRole('button').textContent).toContain('→')
    expect(screen.getByRole('button', { name: 'PDF' })).toBeTruthy()
  })
})
