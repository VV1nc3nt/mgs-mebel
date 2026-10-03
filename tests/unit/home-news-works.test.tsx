import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HomeNews } from '@/components/home/HomeNews'
import { HomeWorks } from '@/components/home/HomeWorks'
import { formatDate } from '@/lib/date'
import { projectCategoryOptions } from '@/lib/projectCategories'
import type { NewsSlide } from '@/lib/queries'
import { nextIndex, prevIndex, wrapIndex } from '@/lib/slider'
import {
  WORK_FILTERS,
  initialWorkFilter,
  toWorkPreview,
  workPanels,
  type ProjectRow,
} from '@/lib/works'
import { photo, video } from './fixtures'
import { env } from './setup'

describe('slider indexes', () => {
  it('go round in both directions', () => {
    expect(nextIndex(2, 3)).toBe(0)
    expect(prevIndex(0, 3)).toBe(2)
    expect(nextIndex(0, 3)).toBe(1)
    expect(wrapIndex(-4, 3)).toBe(2)
    expect(wrapIndex(5, 0)).toBe(0)
  })
})

describe('formatDate', () => {
  it('formats a day in Moscow time as dd.MM.yyyy', () => {
    expect(formatDate('2026-02-19T12:00:00.000Z')).toBe('19.02.2026')
    // 22:30 UTC is already the next day in Moscow
    expect(formatDate('2026-06-22T22:30:00.000Z')).toBe('23.06.2026')
  })

  it('gives an empty string for an empty or invalid value', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate('not a date')).toBe('')
  })
})

const project = (
  id: number,
  category: ProjectRow['category'],
  kind: 'photo' | 'video' = 'photo',
): ProjectRow => ({
  id,
  title: `Работа ${id}`,
  slug: `rabota-${id}`,
  category,
  slides:
    kind === 'video'
      ? [
          { type: 'video', file: video, poster: photo },
          { type: 'photo', file: photo },
        ]
      : [{ type: 'photo', file: photo }],
})

describe('works chips', () => {
  it('are reels, then the categories in the order of the select', () => {
    expect(WORK_FILTERS.map((f) => f.key)).toEqual([
      'reels',
      ...projectCategoryOptions.map((o) => o.value),
    ])
    expect(WORK_FILTERS[0]!.label).toBe('reels')
  })

  it('leave out chips without works and keep at most 4 previews', () => {
    const panels = workPanels({
      kitchens: [1, 2, 3, 4, 5].map((id) => project(id, 'kitchens')),
      reels: [project(6, 'bedrooms', 'video')],
      bathrooms: [],
    })
    expect(panels.map((p) => p.key)).toEqual(['reels', 'kitchens'])
    expect(panels[1]!.works).toHaveLength(4)
  })

  it('start on «Комплекс», else on the first chip with works', () => {
    expect(initialWorkFilter(workPanels({ kitchens: [project(1, 'kitchens')] }))).toBe('kitchens')
    expect(
      initialWorkFilter(
        workPanels({ kitchens: [project(1, 'kitchens')], complex: [project(2, 'complex')] }),
      ),
    ).toBe('complex')
    expect(initialWorkFilter([])).toBeUndefined()
  })

  it('preview the video poster or the first photo, with the project’s own category', () => {
    const reel = toWorkPreview(project(1, 'bathrooms', 'video'))
    expect(reel).toMatchObject({ kind: 'video', category: 'Санузлы', image: photo })
    expect(reel.href).toBe('/works?category=bathrooms')
    expect(toWorkPreview(project(2, 'hallways'))).toMatchObject({
      kind: 'photo',
      category: 'Прихожие',
      image: photo,
    })
  })
})

const news = (id: number): NewsSlide => ({
  id,
  title: `Новость ${id}`,
  slug: `novost-${id}`,
  date: '2026-02-19T12:00:00.000Z',
  lead: `Лид ${id}`,
  cover: photo,
})
const newsSection = { label: 'новости', title: 'Что нового' }

describe('HomeNews', () => {
  it('renders nothing without news', () => {
    expect(render(<HomeNews section={newsSection} news={[]} />).container.innerHTML).toBe('')
  })

  it('has no arrows and segments with one news; the card link is named by its title', () => {
    render(<HomeNews section={newsSection} news={[news(1)]} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    const link = screen.getByRole('link', { name: 'Новость 1' })
    expect(link.getAttribute('href')).toBe('/news/novost-1')
    expect(screen.getByText('19.02.2026')).toBeTruthy()
  })

  it('arrows and segments go round and mark the current slide', () => {
    render(<HomeNews section={newsSection} news={[news(1), news(2), news(3)]} />)
    const carousel = screen.getByRole('region', { name: 'Что нового' })
    expect(carousel.getAttribute('aria-roledescription')).toBe('карусель')
    const current = () =>
      screen
        .getAllByRole('button', { name: /^Показать новость/ })
        .findIndex((b) => b.hasAttribute('aria-current'))
    expect(current()).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Предыдущая новость' }))
    expect(current()).toBe(2)
    fireEvent.click(screen.getByRole('button', { name: 'Следующая новость' }))
    expect(current()).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Показать новость 2 из 3' }))
    expect(current()).toBe(1)
    expect(
      within(carousel)
        .getAllByRole('group')
        .map((g) => g.getAttribute('aria-label')),
    ).toEqual(['1 из 3', '2 из 3', '3 из 3'])
  })

  it('follows a swipe: the slide in view becomes current', () => {
    render(<HomeNews section={newsSection} news={[news(1), news(2), news(3)]} />)
    const slides = screen.getAllByRole('group')
    act(() => {
      for (const observer of env.observers) {
        observer.callback(
          [{ target: slides[2]!, isIntersecting: true } as unknown as IntersectionObserverEntry],
          {} as IntersectionObserver,
        )
      }
    })
    expect(
      screen.getByRole('button', { name: 'Показать новость 3 из 3' }).getAttribute('aria-current'),
    ).toBe('true')
  })
})

describe('HomeWorks', () => {
  const section = {
    label: 'наши работы',
    title: 'Реальные проекты',
    buttonLabel: 'Смотреть все работы',
  }
  const panels = workPanels({
    reels: [project(1, 'kitchens', 'video')],
    complex: [project(2, 'complex'), project(3, 'complex')],
  })

  it('renders nothing without works', () => {
    expect(render(<HomeWorks section={section} panels={[]} />).container.innerHTML).toBe('')
  })

  it('chips switch panels and aria-pressed', () => {
    render(<HomeWorks section={section} panels={panels} />)
    const chips = within(screen.getByRole('group', { name: 'Категории работ' })).getAllByRole(
      'button',
    )
    expect(chips.map((c) => c.textContent)).toEqual(['reels', 'Комплекс'])
    expect(chips[1]!.getAttribute('aria-pressed')).toBe('true')
    const reels = document.getElementById('works-reels')!
    const complex = document.getElementById('works-complex')!
    expect(reels.hidden).toBe(true)
    expect(complex.hidden).toBe(false)
    fireEvent.click(chips[0]!)
    expect(chips[0]!.getAttribute('aria-pressed')).toBe('true')
    expect(chips[0]!.getAttribute('aria-controls')).toBe('works-reels')
    expect(reels.hidden).toBe(false)
    expect(complex.hidden).toBe(true)
    expect(within(reels).getByRole('link').getAttribute('href')).toBe('/works?category=kitchens')
    expect(within(reels).getByText('Видео')).toBeTruthy()
  })

  it('links «Смотреть все работы» to the works page', () => {
    render(<HomeWorks section={section} panels={panels} />)
    expect(screen.getByRole('link', { name: /Смотреть все работы/ }).getAttribute('href')).toBe(
      '/works',
    )
  })
})
