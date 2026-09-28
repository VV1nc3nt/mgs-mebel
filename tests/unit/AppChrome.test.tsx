import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppFooter } from '@/components/app/AppFooter'
import { AppHeader } from '@/components/app/AppHeader'
import { toChrome } from '@/lib/chrome'
import { globals } from '@/seed/data/globals'

const nav = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }))

const seed = globals(() => 0)
const full = toChrome(seed.layout, seed.settings)
const empty = toChrome({}, {})

beforeEach(() => {
  nav.pathname = '/'
})

describe('AppHeader', () => {
  it('lies over the hero on hero pages and flows elsewhere', () => {
    const { container, rerender } = render(<AppHeader chrome={full} />)
    expect(container.querySelector('header')?.dataset.variant).toBe('hero')
    nav.pathname = '/salons'
    rerender(<AppHeader chrome={full} />)
    expect(container.querySelector('header')?.dataset.variant).toBe('flow')
  })

  it('has no «←» on the home page', () => {
    render(<AppHeader chrome={full} />)
    expect(screen.queryByRole('link', { name: /Назад|На главную$/ })).toBeNull()
  })

  it('marks the section of a nested page as current', () => {
    nav.pathname = '/news/new-collection'
    render(<AppHeader chrome={full} />)
    expect(screen.getByRole('link', { name: 'Назад к новостям' }).getAttribute('href')).toBe(
      '/news',
    )
    const current = screen.getByRole('link', { current: 'page' })
    expect(current.textContent).toBe('Новости')
  })

  it('leads the CTA to a messenger and names it', () => {
    render(<AppHeader chrome={full} />)
    const cta = screen.getByRole('link', { name: 'Рассчитать проект в WhatsApp' })
    expect(cta.getAttribute('href')).toBe('https://wa.me/79270963555')
    expect(cta.getAttribute('target')).toBe('_blank')
    expect(screen.getByRole('link', { name: '8 800 100-16-58' }).getAttribute('href')).toBe(
      'tel:88001001658',
    )
  })

  it('renders empty globals without empty controls', () => {
    nav.pathname = '/salons'
    render(<AppHeader chrome={empty} />)
    expect(screen.queryByRole('navigation')).toBeNull()
    const names = screen
      .getAllByRole('link')
      .map((l) => l.getAttribute('aria-label') ?? l.textContent)
    expect(names).toEqual(['На главную', 'MGS MEBEL — на главную'])
  })
})

describe('AppFooter', () => {
  it('shows slogan, hotline, socials in footer order and the copyright with the year', () => {
    render(<AppFooter chrome={full} />)
    expect(screen.getByText('для жизни').className).toContain('text-accent')
    expect(screen.getByText('Бесплатная горячая линия')).toBeTruthy()
    const socials = screen
      .getAllByRole('listitem')
      .map((li) => li.querySelector('a')?.getAttribute('aria-label'))
    expect(socials).toEqual(['Telegram', 'MAX', 'WhatsApp'])
    for (const link of screen.getAllByRole('listitem').map((li) => li.querySelector('a')!)) {
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    }
    expect(screen.getByText(/^© \d{4} MGS MEBEL\. Все права защищены\.$/)).toBeTruthy()
  })

  it('hides a missing messenger and the whole block without any', () => {
    const { rerender } = render(
      <AppFooter chrome={toChrome(seed.layout, { messengers: { telegram: 'https://t.me/x' } })} />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    rerender(<AppFooter chrome={toChrome(seed.layout, {})} />)
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('renders empty globals as an empty footer', () => {
    const { container } = render(<AppFooter chrome={empty} />)
    expect(container.querySelector('footer')?.textContent).toBe('')
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })
})
