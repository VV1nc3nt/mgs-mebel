import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NewsSection } from '@/components/sections/NewsSection'
import { WorksSection } from '@/components/sections/WorksSection'
import { formatDate } from '@/lib/date'
import type { NewsSlide } from '@/lib/queries'
import { nextIndex, prevIndex, wrapIndex } from '@/lib/slider'
import {
  buildFeeds,
  initialWorkFilter,
  workPanels,
  type ItemRow,
  type ProjectRow,
} from '@/lib/works'
import { WORK_FEEDS } from '@/lib/workTypes'
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

const posterVideo = { ...video, poster: photo }

const project = (id: number, extra: Partial<ProjectRow> = {}): ProjectRow => ({
  id,
  title: `Проект ${id}`,
  slug: `proekt-${id}`,
  place: `ЖК ${id}`,
  complex: true,
  cover: null,
  videos: [],
  featured: false,
  hidden: false,
  ...extra,
})

const item = (id: number, extra: Partial<ItemRow> = {}): ItemRow => ({
  id,
  title: null,
  type: 'kitchens',
  project: null,
  place: null,
  photos: [photo],
  videos: [],
  featured: false,
  hidden: false,
  ...extra,
})

describe('home works chips', () => {
  it('are the feeds of the works page in the order of the design', () => {
    expect(WORK_FEEDS.map((f) => f.value)).toEqual([
      'reels',
      'complex',
      'kitchens',
      'bedrooms',
      'wardrobes',
      'hallways',
      'bathrooms',
      'kids',
      'livingrooms',
    ])
  })

  it('leave out chips without works and keep at most 4 previews, «На главной» first', () => {
    const panels = workPanels(
      buildFeeds(
        [],
        [
          ...[1, 2, 3, 4].map((id) => item(id, { title: `Кухня ${id}` })),
          item(5, { title: 'Кухня 5', featured: true }),
          item(6, { type: 'bedrooms', videos: [posterVideo] }),
        ],
      ),
    )
    expect(panels.map((p) => p.key)).toEqual(['reels', 'kitchens', 'bedrooms'])
    expect(panels[1]!.works.map((w) => w.title)).toEqual([
      'Кухня 5',
      'Кухня 1',
      'Кухня 2',
      'Кухня 3',
    ])
  })

  it('start on «Комплекс», else on the first chip with works', () => {
    expect(initialWorkFilter(workPanels(buildFeeds([], [item(1)])))).toBe('kitchens')
    expect(initialWorkFilter(workPanels(buildFeeds([project(2)], [item(1, { project: 2 })])))).toBe(
      'complex',
    )
    expect(initialWorkFilter([])).toBeUndefined()
  })

  it('link a project to its page, an item to its view, a reel to REELS', () => {
    const panels = workPanels(
      buildFeeds([project(2)], [item(1, { project: 2, type: 'bathrooms', videos: [posterVideo] })]),
    )
    const by = (key: string) => panels.find((p) => p.key === key)!.works[0]!
    expect(by('complex')).toMatchObject({ href: '/works/proekt-2', kind: 'video', image: photo })
    expect(by('bathrooms')).toMatchObject({
      href: '/works?category=bathrooms&item=1',
      category: 'Санузел',
      title: 'Санузел',
    })
    expect(by('reels')).toMatchObject({ href: '/works?category=reels', kind: 'video' })
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

describe('NewsSection', () => {
  it('renders nothing without news', () => {
    expect(render(<NewsSection section={newsSection} news={[]} />).container.innerHTML).toBe('')
  })

  it('has no arrows and segments with one news; the card link is named by its title', () => {
    render(<NewsSection section={newsSection} news={[news(1)]} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    const link = screen.getByRole('link', { name: 'Новость 1' })
    expect(link.getAttribute('href')).toBe('/news/novost-1')
    expect(screen.getByText('19.02.2026')).toBeTruthy()
  })

  it('arrows and segments go round and mark the current slide', () => {
    render(<NewsSection section={newsSection} news={[news(1), news(2), news(3)]} />)
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
    render(<NewsSection section={newsSection} news={[news(1), news(2), news(3)]} />)
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
  it('a cover video downloads and plays only on the current card', () => {
    const withVideo = (id: number) => ({ ...news(id), coverVideo: video })
    render(<NewsSection section={newsSection} news={[withVideo(1), news(2), withVideo(3)]} />)
    const slides = screen.getAllByRole('group')
    // Only the video observers (the slider's own one watches the slides)
    const videosInView = () =>
      act(() => {
        for (const observer of env.observers) {
          if (observer.elements.some((el) => slides.includes(el as HTMLElement))) continue
          observer.callback(
            observer.elements.map((target) => ({
              target,
              isIntersecting: true,
              intersectionRatio: 1,
            })) as never,
            {} as IntersectionObserver,
          )
        }
      })
    const videoIn = (i: number) => slides[i]!.querySelector('video')
    videosInView()
    expect(videoIn(0)!.querySelector('source')!.getAttribute('src')).toBe(video.url)
    expect(slides[1]!.querySelector('[data-bg-video]')).toBeNull()
    expect(slides[2]!.querySelector('[data-bg-video]')).not.toBeNull()
    expect(videoIn(2)).toBeNull()

    const first = videoIn(0)!
    const pause = vi.mocked(HTMLMediaElement.prototype.pause)
    const play = vi.mocked(HTMLMediaElement.prototype.play)
    pause.mockClear()
    play.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Показать новость 3 из 3' }))
    videosInView()
    expect(videoIn(2)).not.toBeNull()
    expect(play.mock.contexts).toContain(videoIn(2))
    expect(play.mock.contexts).not.toContain(first)
    // The card left keeps its video, paused where it was
    expect(videoIn(0)).toBe(first)
    expect(pause.mock.contexts).toContain(first)
  })
})

describe('WorksSection', () => {
  const section = {
    label: 'наши работы',
    title: 'Реальные проекты',
    buttonLabel: 'Смотреть все работы',
  }
  const panels = workPanels(
    buildFeeds(
      [project(2), project(3)],
      [item(1, { project: 2, videos: [posterVideo] }), item(4, { project: 3 })],
    ),
  )

  it('renders nothing without works', () => {
    expect(render(<WorksSection section={section} panels={[]} />).container.innerHTML).toBe('')
  })

  it('chips switch panels and aria-pressed', () => {
    render(<WorksSection section={section} panels={panels} />)
    const chips = within(screen.getByRole('group', { name: 'Категории работ' })).getAllByRole(
      'button',
    )
    expect(chips.map((c) => c.textContent)).toEqual(['reels', 'Комплекс', 'Кухни'])
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
    expect(within(reels).getByRole('link').getAttribute('href')).toBe('/works?category=reels')
    expect(within(reels).getByText('Видео')).toBeTruthy()
  })

  it('links «Смотреть все работы» to the works page', () => {
    render(<WorksSection section={section} panels={panels} />)
    expect(screen.getByRole('link', { name: /Смотреть все работы/ }).getAttribute('href')).toBe(
      '/works',
    )
  })
})
