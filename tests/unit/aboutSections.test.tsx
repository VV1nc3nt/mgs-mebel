import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ExhibitionsSection } from '@/components/about/ExhibitionsSection'
import { HardwareSection } from '@/components/about/HardwareSection'
import { IntroSection } from '@/components/about/IntroSection'
import { PresentationSection } from '@/components/about/PresentationSection'
import { HistorySection } from '@/components/sections/HistorySection'
import { StatsSection } from '@/components/sections/StatsSection'
import { StatCard } from '@/components/ui/StatCard'
import { photo, video } from './fixtures'

const stats = [
  { id: 'a', value: '1000+', label: 'изделий в день' },
  { id: 'b', value: '20+', label: 'лет на рынке' },
]

describe('StatCard / StatsSection', () => {
  it('sizes: md — the strip value, lg — the larger grid value', () => {
    const { rerender } = render(<StatCard value="20+" label="лет" />)
    expect(screen.getByText('20+').className).toContain('text-stat')
    expect(screen.getByText('20+').className).not.toContain('text-stat-lg')
    rerender(<StatCard value="20+" label="лет" size="lg" />)
    expect(screen.getByText('20+').className).toContain('text-stat-lg')
  })

  it('strip — a focusable scroll-snap list; grid — 3 columns of large cards', () => {
    const { container, rerender } = render(<StatsSection items={stats} />)
    const list = container.querySelector('ul')!
    expect(list.tabIndex).toBe(0)
    expect(list.className).toContain('snap-x')
    rerender(<StatsSection items={stats} variant="grid" />)
    const grid = container.querySelector('ul')!
    expect(grid.hasAttribute('tabindex')).toBe(false)
    expect(grid.className).toContain('grid-cols-3')
    expect(screen.getByText('1000+').className).toContain('text-stat-lg')
  })
})

describe('HistorySection', () => {
  const history = { label: 'история', photoMain: photo, lead: 'Лид', text: 'Абзац.' }

  it('the label names the section; without a label — no aria-labelledby', () => {
    const { container, rerender } = render(<HistorySection history={history} />)
    const section = container.querySelector('section')!
    expect(section.getAttribute('aria-labelledby')).toBe('about-history-label')
    expect(document.getElementById('about-history-label')?.textContent).toBe('#история')
    expect(screen.getByRole('region', { name: 'история' })).toBe(section)
    rerender(<HistorySection history={{ ...history, label: ' ' }} />)
    expect(container.querySelector('section')!.hasAttribute('aria-labelledby')).toBe(false)
    expect(container.querySelector('[id]')).toBeNull()
  })

  it('the statistics grid under the text, desktop only', () => {
    const { container, rerender } = render(<HistorySection history={history} stats={stats} />)
    const grid = container.querySelector('ul')!
    expect(grid.parentElement!.className).toContain('hidden')
    expect(grid.parentElement!.className).toContain('xl:block')
    expect(within(grid).getAllByRole('listitem')).toHaveLength(2)
    rerender(<HistorySection history={history} stats={[]} />)
    expect(container.querySelector('ul')).toBeNull()
  })
})

describe('IntroSection', () => {
  it('the text with the accent phrase; desktop only, in the HTML', () => {
    const { container } = render(
      <IntroSection intro={{ text: 'Мечтаете о доме?', accent: 'Доверьтесь нам.' }} />,
    )
    expect(container.querySelector('section')!.className).toContain('xl:block')
    expect(container.querySelector('p')!.textContent).toBe('Мечтаете о доме? Доверьтесь нам.')
    expect(screen.getByText('Доверьтесь нам.').className).toContain('text-accent')
  })

  it('no text — no section', () => {
    expect(render(<IntroSection intro={{ accent: 'Акцент' }} />).container.innerHTML).toBe('')
    expect(render(<IntroSection intro={undefined} />).container.innerHTML).toBe('')
  })
})

describe('PresentationSection', () => {
  const mission = {
    label: 'миссия',
    title: 'Мы — MGS MEBEL',
    text: 'Воплощаем мечты',
    poster: photo,
    video,
    caption: 'Презентация',
    duration: '02:17',
  }

  it('a player host with the heading fading over it; ▶ named with the caption', () => {
    const { container } = render(<PresentationSection mission={mission} />)
    const section = container.querySelector('section')!
    expect(section.hasAttribute('data-player-host')).toBe(true)
    expect(screen.getByRole('region', { name: 'Мы — MGS MEBEL' })).toBe(section)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.id).toBe('about-mission-title')
    expect(heading.parentElement!.className).toContain('media-heading-fade')
    expect(screen.getByRole('button', { name: 'Смотреть видео: Презентация' })).toBeTruthy()
    expect(container.querySelector('video')).toBeNull()
  })

  it('a known link plays too; neither file nor link — the poster without ▶', () => {
    const { rerender } = render(
      <PresentationSection
        mission={{
          ...mission,
          video: null,
          embedUrl: 'https://rutube.ru/video/1480655fcab995b927db77bdd9d83986/',
        }}
      />,
    )
    expect(screen.getByRole('button')).toBeTruthy()
    rerender(<PresentationSection mission={{ ...mission, video: null, embedUrl: null }} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByAltText(photo.alt!)).toBeTruthy()
  })

  it('no poster — no section', () => {
    expect(
      render(<PresentationSection mission={{ ...mission, poster: undefined }} />).container
        .innerHTML,
    ).toBe('')
  })
})

describe('HardwareSection', () => {
  const hardware = {
    label: 'фурнитура',
    title: 'Фурнитура',
    poster: photo,
    video,
    caption: 'Системы',
  }

  it('heading, background video block and the caption', () => {
    const { container } = render(<HardwareSection hardware={hardware} />)
    expect(screen.getByRole('heading', { level: 2 }).id).toBe('about-hardware-title')
    expect(screen.getByText('Системы')).toBeTruthy()
    expect(container.querySelector('.bg-overlay-side')!.className).toContain('xl:block')
  })

  it('no poster — no section', () => {
    expect(
      render(<HardwareSection hardware={{ ...hardware, poster: undefined }} />).container.innerHTML,
    ).toBe('')
  })
})

describe('ExhibitionsSection', () => {
  const item = (id: string, title: string, poster: typeof photo | null = photo) => ({
    id,
    date: '2025',
    title,
    text: 'Текст',
    poster: poster as typeof photo,
    video,
  })

  it('cards without a poster or a title are left out; arrows named', () => {
    render(
      <ExhibitionsSection
        exhibitions={{
          label: 'выставки',
          title: 'На выставках',
          items: [item('1', 'Выставка 2026'), item('2', ' '), item('3', 'Без фото', null)],
        }}
      />,
    )
    expect(screen.getByRole('region', { name: 'На выставках' })).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Выставка 2026',
    ])
    expect(screen.getAllByRole('group')).toHaveLength(1)
  })

  it('arrows with several cards; without an H2 the heading block names the slider', () => {
    const { container } = render(
      <ExhibitionsSection
        exhibitions={{ label: 'выставки', items: [item('1', 'А'), item('2', 'Б')] }}
      />,
    )
    expect(screen.getByRole('button', { name: 'Предыдущая выставка' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Следующая выставка' })).toBeTruthy()
    const id = container.querySelector('section')!.getAttribute('aria-labelledby')!
    expect(document.getElementById(id)?.textContent).toBe('#выставки')
  })

  it('nothing to show — no section', () => {
    expect(render(<ExhibitionsSection exhibitions={{ items: [] }} />).container.innerHTML).toBe('')
    expect(render(<ExhibitionsSection exhibitions={undefined} />).container.innerHTML).toBe('')
  })
})
