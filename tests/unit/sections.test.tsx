import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HeroSection } from '@/components/sections/HeroSection'
import { HistorySection } from '@/components/sections/HistorySection'
import { StatsSection } from '@/components/sections/StatsSection'
import { paragraphs } from '@/lib/text'
import { photo, video } from './fixtures'

const hero = {
  label: 'о нас',
  title: 'Мы — MGS MEBEL',
  text: 'Мебельная фабрика полного цикла.',
  ctaLabel: 'Рассчитать проект',
  poster: photo,
  video,
}
const whatsapp = { kind: 'whatsapp' as const, href: 'https://wa.me/79270963555' }

describe('HeroSection', () => {
  it('renders the H1, text and a messenger CTA in a new tab', () => {
    render(<HeroSection hero={hero} messengers={[whatsapp]} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Мы — MGS MEBEL')
    const cta = screen.getByRole('link', { name: 'Рассчитать проект в WhatsApp' })
    expect(cta.getAttribute('href')).toBe(whatsapp.href)
    expect(cta.getAttribute('target')).toBe('_blank')
    expect(cta.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('has no CTA without a messenger or without a label', () => {
    const { rerender } = render(<HeroSection hero={hero} messengers={[]} />)
    expect(screen.queryByRole('link')).toBeNull()
    rerender(<HeroSection hero={{ ...hero, ctaLabel: ' ' }} messengers={[whatsapp]} />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('is not rendered without a title (empty or partial global)', () => {
    const { container } = render(
      <HeroSection hero={{ ...hero, title: '' }} messengers={[whatsapp]} />,
    )
    expect(container.innerHTML).toBe('')
    expect(render(<HeroSection hero={undefined} messengers={[]} />).container.innerHTML).toBe('')
  })
})

describe('StatsSection', () => {
  it('renders nothing for an empty global', () => {
    expect(render(<StatsSection items={undefined} />).container.innerHTML).toBe('')
    expect(render(<StatsSection items={[]} />).container.innerHTML).toBe('')
  })

  it('lists the values with their captions', () => {
    render(<StatsSection items={[{ id: 'a', value: '1000+', label: 'изделий в день' }]} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('1000+')).toBeTruthy()
  })
})

describe('HistorySection', () => {
  const history = {
    photoMain: photo,
    yearValue: '2001',
    yearCaption: 'год основания фабрики',
    lead: 'Лид',
    text: 'Первый абзац.\n\nВторой абзац.',
    values: [{ label: 'Качество' }],
    linkLabel: 'Подробнее о компании',
  }

  it('splits the text into paragraphs and links to «О нас»', () => {
    render(<HistorySection history={history} linkHref="/about" />)
    expect(screen.getByText('Первый абзац.')).toBeTruthy()
    expect(screen.getByText('Второй абзац.')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Подробнее о компании/ }).getAttribute('href')).toBe(
      '/about',
    )
  })

  it('has no link without linkHref or label, and renders nothing when empty', () => {
    render(<HistorySection history={{ ...history, linkLabel: null }} linkHref="/about" />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(render(<HistorySection history={{}} />).container.innerHTML).toBe('')
  })
})

describe('paragraphs', () => {
  it('splits by blank lines and squashes inner whitespace', () => {
    expect(paragraphs('a\nb\n\n  c  \r\n\r\nd')).toEqual(['a b', 'c', 'd'])
    expect(paragraphs(null)).toEqual([])
  })
})
