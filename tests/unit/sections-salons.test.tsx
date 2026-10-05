import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SalonsSection } from '@/components/sections/SalonsSection'
import { SalonCard } from '@/components/salons/SalonCard'
import { SalonPanel } from '@/components/salons/SalonPanel'
import type { SalonPin } from '@/lib/queries'

const salon: SalonPin = {
  id: 1,
  name: 'ЖК Варшавская LIFE',
  address: 'Москва, Котляковский пер., 2А к.3',
  phone: '8-495-777-35-75',
  location: { lat: 55.650212, lng: 37.631115 },
  order: 1,
}
const whatsapp = { kind: 'whatsapp' as const, href: 'https://wa.me/79270963555' }
const CTA = 'Заказать персональный дизайн'

describe('SalonCard', () => {
  it('renders the name, address, a tel: link and a messenger CTA in a new tab', () => {
    render(<SalonCard salon={salon} ctaLabel={CTA} messengers={[whatsapp]} />)
    expect(screen.getByText('Фирменный салон')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(salon.name)
    expect(screen.getByText(salon.address)).toBeTruthy()
    const phone = screen.getByRole('link', { name: salon.phone! })
    expect(phone.getAttribute('href')).toBe('tel:84957773575')
    const cta = screen.getByRole('link', { name: `${CTA} в WhatsApp` })
    expect(cta.getAttribute('href')).toBe(whatsapp.href)
    expect(cta.getAttribute('target')).toBe('_blank')
    expect(cta.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('has no «Телефон» row without a phone', () => {
    render(<SalonCard salon={{ ...salon, phone: null }} ctaLabel={CTA} messengers={[whatsapp]} />)
    expect(screen.queryByText('Телефон')).toBeNull()
    expect(screen.queryByRole('link', { name: /tel:/ })).toBeNull()
    expect(screen.getByText('Адрес')).toBeTruthy()
  })

  it('has no CTA without a messenger or without a label', () => {
    const { rerender } = render(<SalonCard salon={salon} ctaLabel={CTA} messengers={[]} />)
    expect(screen.queryByRole('link', { name: new RegExp(CTA) })).toBeNull()
    rerender(<SalonCard salon={salon} ctaLabel=" " messengers={[whatsapp]} />)
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).toBeNull()
  })

  it('shows × only with onClose', () => {
    const onClose = vi.fn()
    const { rerender } = render(<SalonCard salon={salon} messengers={[]} />)
    expect(screen.queryByRole('button', { name: 'Скрыть карточку салона' })).toBeNull()
    rerender(<SalonCard salon={salon} messengers={[]} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Скрыть карточку салона' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('SalonPanel', () => {
  it('moves focus between × and «Показать салон», not on mount', () => {
    render(<SalonPanel salon={salon} ctaLabel={CTA} messengers={[whatsapp]} />)
    const close = screen.getByRole('button', { name: 'Скрыть карточку салона' })
    expect(document.activeElement).not.toBe(close)

    fireEvent.click(close)
    expect(screen.queryByRole('heading', { name: salon.name })).toBeNull()
    const show = screen.getByRole('button', { name: 'Показать салон' })
    expect(document.activeElement).toBe(show)

    fireEvent.click(show)
    expect(screen.getByRole('heading', { name: salon.name })).toBeTruthy()
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Скрыть карточку салона' }),
    )
  })
})

describe('SalonsSection', () => {
  const section = { label: 'фирменные салоны', title: '50+ салонов по России' }

  it('renders nothing without salons', () => {
    const { container } = render(
      <SalonsSection section={section} salons={[]} ctaLabel={CTA} messengers={[whatsapp]} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('shows the H2, the view switch and the card of the first salon', () => {
    const second = { ...salon, id: 2, name: 'Химки', order: 2 }
    render(
      <SalonsSection
        section={section}
        salons={[salon, second]}
        ctaLabel={CTA}
        messengers={[whatsapp]}
      />,
    )
    expect(screen.getByRole('region', { name: section.title })).toBeTruthy()
    const view = screen.getByRole('group', { name: 'Вид: карта или список' })
    expect(within(view).getByText('Карта').getAttribute('aria-current')).toBe('true')
    expect(within(view).getByRole('link', { name: 'Список' }).getAttribute('href')).toBe('/salons')
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(salon.name)
  })
})
