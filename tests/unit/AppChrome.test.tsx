import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppFooter } from '@/components/app/AppFooter'
import { AppHeader } from '@/components/app/AppHeader'
import { MenuProvider } from '@/components/app/MenuProvider'
import { toChrome } from '@/lib/chrome'
import { toFooter } from '@/lib/footer'
import { globals } from '@/seed/data/globals'

const nav = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }))

const seed = globals(() => 0)
const full = toChrome(seed.layout, seed.settings)
const empty = toChrome({}, {})

/** The header menu button reads the menu state. */
const header = (chrome: typeof full) => (
  <MenuProvider>
    <AppHeader chrome={chrome} />
  </MenuProvider>
)

beforeEach(() => {
  nav.pathname = '/'
})

describe('AppHeader', () => {
  it('lies over the hero on hero pages and flows elsewhere', () => {
    const { container, rerender } = render(header(full))
    expect(container.querySelector('header')?.dataset.variant).toBe('hero')
    nav.pathname = '/salons'
    rerender(header(full))
    expect(container.querySelector('header')?.dataset.variant).toBe('flow')
  })

  it('has no «←» on the home page', () => {
    render(header(full))
    expect(screen.queryByRole('link', { name: /Назад|На главную$/ })).toBeNull()
  })

  it('marks the section of a nested page as current', () => {
    nav.pathname = '/news/new-collection'
    render(header(full))
    expect(screen.getByRole('link', { name: 'Назад к новостям' }).getAttribute('href')).toBe(
      '/news',
    )
    const current = screen.getByRole('link', { current: 'page' })
    expect(current.textContent).toBe('Новости')
  })

  it('the CTA opens the choice of messengers', () => {
    render(header(full))
    const cta = screen.getByRole('button', { name: 'Рассчитать проект — выбрать мессенджер' })
    expect(cta.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('link', { name: '8 800 100-16-58' }).getAttribute('href')).toBe(
      'tel:88001001658',
    )
  })

  it('shows the menu button only when there are sections', () => {
    const { rerender } = render(header(full))
    const button = screen.getByRole('button', { name: 'Открыть меню' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.className).toContain('border-text/25')
    rerender(header(empty))
    expect(screen.queryByRole('button', { name: 'Открыть меню' })).toBeNull()
  })

  it('renders empty globals without empty controls', () => {
    nav.pathname = '/salons'
    render(header(empty))
    expect(screen.queryByRole('navigation')).toBeNull()
    const names = screen
      .getAllByRole('link')
      .map((l) => l.getAttribute('aria-label') ?? l.textContent)
    expect(names).toEqual(['На главную', 'MGS MEBEL — на главную'])
  })
})

describe('AppFooter', () => {
  const salons = [
    { name: 'Пражская', address: 'Кировоградская, 15' },
    { name: 'Химки', address: null },
  ]
  const legal = {
    privacy: { href: '/privacy', title: 'Политика конфиденциальности' },
    offer: { href: '/offer', title: 'Оферта' },
  }
  const footerOf = (
    layout: typeof seed.layout | object = seed.layout,
    settings: typeof seed.settings | object = seed.settings,
  ) => {
    const chrome = toChrome(layout, settings)
    return toFooter({
      layout,
      settings,
      nav: chrome.nav,
      phone: chrome.phone,
      messengers: chrome.messengers,
      salons,
      legal,
    })
  }

  it('shows the slogan, the columns, the contacts and the bottom row', () => {
    render(<AppFooter footer={footerOf()} cookieSettings />)
    expect(screen.getByText('для жизни').className).toContain('text-accent')
    // A line break typed in the CMS becomes <br> (design: «Производитель<br>мебели»)
    const slogan = screen.getByText('для жизни').parentElement!
    expect(slogan.innerHTML).toMatch(/^Производитель<br>мебели <span/)
    // Buyers: no links in the seed — no column
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent?.trim())).toEqual([
      'МенюМеню',
      'СалоныСалоны',
      'Контакты',
    ])
    const contacts = screen.getByRole('region', { name: 'Контакты' })
    const messengers = within(contacts).getAllByRole('link', { name: /^(MAX|Telegram|WhatsApp)$/ })
    expect(messengers.map((a) => a.getAttribute('aria-label'))).toEqual([
      'MAX',
      'Telegram',
      'WhatsApp',
    ])
    for (const link of messengers) {
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    }
    expect(screen.getByRole('link', { name: '8 800 100-16-58' }).getAttribute('href')).toBe(
      'tel:88001001658',
    )
    expect(screen.getByRole('link', { name: 'Оферта' }).getAttribute('href')).toBe('/offer')
    expect(screen.getByRole('button', { name: 'Настройки cookies' })).toBeTruthy()
    expect(screen.getByText(/^© \d{4} MGS MEBEL\. Все права защищены\.$/)).toBeTruthy()
    expect(screen.getByText('Расскажем о сроках и стоимости')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Рассчитать проект — выбрать мессенджер' }),
    ).toBeTruthy()
  })

  it('the menu accordion: one open at a time, the links stay in the DOM', () => {
    render(<AppFooter footer={footerOf()} cookieSettings />)
    const menu = screen.getByRole('button', { name: 'Меню' })
    const salonsButton = screen.getByRole('button', { name: 'Салоны' })
    const panel = document.getElementById(menu.getAttribute('aria-controls')!)!
    expect(menu.getAttribute('aria-expanded')).toBe('false')
    expect(panel.className).toContain('max-md:hidden')
    expect(panel.querySelectorAll('a')).toHaveLength(6)
    fireEvent.click(menu)
    expect(menu.getAttribute('aria-expanded')).toBe('true')
    expect(panel.className).not.toContain('max-md:hidden')
    fireEvent.click(salonsButton)
    expect(menu.getAttribute('aria-expanded')).toBe('false')
    expect(salonsButton.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(salonsButton)
    expect(salonsButton.getAttribute('aria-expanded')).toBe('false')
  })

  it('shows the requisites instead of the copyright', () => {
    render(
      <AppFooter
        footer={footerOf(seed.layout, {
          ...seed.settings,
          requisites: { company: 'ООО «МГС»', inn: '7700000000', legalAddress: 'Москва' },
        })}
        cookieSettings={false}
      />,
    )
    const legalText = screen.getByText(/ООО «МГС»/)
    expect(legalText.textContent).toMatch(/^© \d{4} ООО «МГС» · ИНН 7700000000Москва$/)
    expect(screen.queryByText(/Все права защищены/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Настройки cookies' })).toBeNull()
  })

  it('renders empty globals as an empty footer', () => {
    const empty = toFooter({
      layout: {},
      settings: {},
      nav: [],
      messengers: [],
      salons: [],
      legal: {},
    })
    const { container } = render(<AppFooter footer={empty} cookieSettings={false} />)
    // The logo only (its letters are hidden from screen readers)
    expect(container.querySelector('footer')?.textContent).toBe('MGSMEBEL')
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })
})
