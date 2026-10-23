import { act, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ProjectAbout } from '@/components/works/ProjectAbout'
import { ProjectCtaTile } from '@/components/works/ProjectCtaTile'
import { WorkViewPanel } from '@/components/works/WorkViewPanel'
import { previousRoute, resetRouteHistory, trackRoute } from '@/lib/routeHistory'
import { parentOf } from '@/lib/routes'
import {
  CTA_RATIO,
  ctaPlace,
  projectAbout,
  projectCta,
  projectGallery,
  projectMeta,
  REEL_PLACES,
  toWorkProject,
  withCta,
  zonesCount,
  type WorkProjectRow,
} from '@/lib/workProject'
import {
  buildProjectIndex,
  buildWorks,
  projectHref,
  REEL_RATIO,
  toWorkPreview,
  visibleProjectHrefs,
  type ItemRow,
  type ProjectRow,
  type ReelTile,
} from '@/lib/works'
import {
  formatPrice,
  frameAt,
  framePlace,
  projectHrefOf,
  projectPreviewPath,
  projectViewHref,
  toViewerItem,
  type ViewerFrame,
  type ViewerItemRow,
} from '@/lib/workView'
import type { Media } from '@/payload-types'
import { photo, video } from './fixtures'

const posterVideo: Media = { ...video, id: 7, poster: photo }
const tall: Media = { ...photo, id: 5, width: 1200, height: 1800 }

const viewRow = (id: number, extra: Partial<ViewerItemRow> = {}): ViewerItemRow => ({
  id,
  title: null,
  type: 'kitchens',
  project: null,
  photos: [
    { ...photo, id: id * 10 },
    { ...tall, id: id * 10 + 1 },
  ],
  videos: [],
  description: null,
  specs: {},
  extraSpecs: [],
  price: null,
  ctaLabel: null,
  hidden: false,
  ...extra,
})

const projectRow = (extra: Partial<WorkProjectRow> = {}): WorkProjectRow => ({
  id: 1,
  title: 'Квартира в тёплых тонах',
  slug: 'kvartira',
  place: 'ЖК Уно',
  city: 'Москва',
  year: 2025,
  complex: true,
  cover: null,
  about: null,
  price: null,
  designer: null,
  videos: [],
  hidden: false,
  meta: {},
  ...extra,
})

const frame = (owner: number, n: number): ViewerFrame => ({
  key: `p-${owner}-${n}`,
  owner,
  kind: 'photo',
  image: photo,
  video: null,
  ratio: 4 / 5,
})

const reel = (n: number): ReelTile => ({
  kind: 'reel',
  key: `r-${n}`,
  title: 'Проект',
  type: null,
  image: photo,
  ratio: REEL_RATIO,
  featured: false,
})

describe('project view address', () => {
  it('builds the page, the item and the frame; the first frame is not written', () => {
    expect(projectHrefOf('kvartira')).toBe('/works/kvartira')
    expect(projectViewHref({ slug: 'kvartira', id: 12 })).toBe('/works/kvartira?item=12')
    expect(projectViewHref({ slug: 'kvartira', id: 12, photo: 1 })).toBe('/works/kvartira?item=12')
    expect(projectViewHref({ slug: 'kvartira', id: 12, photo: 3 })).toBe(
      '/works/kvartira?item=12&photo=3',
    )
  })

  it('maps an item frame to the frames of the whole project and back', () => {
    const frames = [frame(3, 0), frame(3, 1), frame(4, 0), frame(4, 1), frame(4, 2)]
    expect(frameAt(frames, 3)).toBe(0)
    expect(frameAt(frames, 4)).toBe(2)
    expect(frameAt(frames, 4, 2)).toBe(4)
    // Out of range — kept within the item
    expect(frameAt(frames, 4, 9)).toBe(4)
    expect(frameAt(frames, 9)).toBe(-1)
    expect(framePlace(frames, 1)).toEqual({ owner: 3, photo: 1 })
    expect(framePlace(frames, 3)).toEqual({ owner: 4, photo: 1 })
    expect(framePlace(frames, 9)).toBeNull()
  })
})

describe('project meta', () => {
  it('counts zones with Russian plurals', () => {
    expect(zonesCount(1)).toBe('1 зона')
    expect(zonesCount(3)).toBe('3 зоны')
    expect(zonesCount(6)).toBe('6 зон')
    expect(zonesCount(11)).toBe('11 зон')
    expect(zonesCount(21)).toBe('21 зона')
  })

  it('joins zones, media and «место, город, год», leaving out empty parts', () => {
    expect(projectMeta({ place: 'ЖК Уно', city: 'Москва', year: 2025 }, 6, 13, 3)).toEqual([
      '6 зон',
      '13 фото + 3 видео',
      'ЖК Уно, Москва, 2025',
    ])
    expect(projectMeta({ place: ' ', city: 'Москва', year: null }, 1, 4, 0)).toEqual([
      '1 зона',
      '4 фото',
      'Москва',
    ])
    expect(projectMeta({ place: null, city: null, year: null }, 2, 0, 1)).toEqual([
      '2 зоны',
      '1 видео',
    ])
  })
})

describe('project gallery', () => {
  const items = {
    3: toViewerItem(viewRow(3, { title: 'Кабинет' }))!,
    4: toViewerItem(viewRow(4, { type: 'bathrooms' }))!,
  }

  it('lays the frames item after item, each a link to the view at it', () => {
    const frames = [frame(3, 0), frame(3, 1), frame(4, 0)]
    const tiles = projectGallery('kvartira', frames, items, [])
    expect(tiles.map((t) => (t.kind === 'frame' ? [t.zone, t.href, t.frame] : t.kind))).toEqual([
      ['Кабинет', '/works/kvartira?item=3', 0],
      ['Кабинет', '/works/kvartira?item=3&photo=2', 1],
      ['Санузел', '/works/kvartira?item=4', 2],
    ])
    // The masonry's ratio is height / width
    expect(tiles[0]!.ratio).toBeCloseTo(5 / 4)
  })

  it('puts the project videos at 0, 6, 12 of the frames, the rest at the end', () => {
    expect(REEL_PLACES).toEqual([0, 6, 12])
    const frames = Array.from({ length: 14 }, (_, n) => frame(3, n))
    const tiles = projectGallery('kvartira', frames, items, [reel(1), reel(2), reel(3), reel(4)])
    const places = tiles.flatMap((t, i) => (t.kind === 'reel' ? [[t.key, i]] : []))
    // 0 frames before the first, 6 before the second, 12 before the third
    expect(places).toEqual([
      ['r-1', 0],
      ['r-2', 7],
      ['r-3', 14],
      ['r-4', 17],
    ])
    expect(
      tiles.filter((t) => t.kind === 'frame').map((t) => t.kind === 'frame' && t.frame),
    ).toEqual(frames.map((_, i) => i))
  })

  it('sends the videos past the frames to the end when there are few', () => {
    const tiles = projectGallery('kvartira', [frame(3, 0), frame(3, 1)], items, [reel(1), reel(2)])
    expect(tiles.map((t) => t.key)).toEqual(['r-1', 'f-p-3-0', 'f-p-3-1', 'r-2'])
  })
})

describe('CTA tile of the gallery', () => {
  const items = { 3: toViewerItem(viewRow(3))! }
  const gallery = (frames: number, reels = 0) =>
    projectGallery(
      'kvartira',
      Array.from({ length: frames }, (_, n) => frame(3, n)),
      items,
      Array.from({ length: reels }, (_, n) => reel(n + 1)),
    )
  const keys = (frames: number, reels = 0) => withCta(gallery(frames, reels), true).map((t) => t.key)

  it('stands before the middle frame, floor(n / 2), never last', () => {
    expect(keys(3)).toEqual(['f-p-3-0', 'cta', 'f-p-3-1', 'f-p-3-2'])
    expect(keys(8).indexOf('cta')).toBe(4)
    expect(keys(13).indexOf('cta')).toBe(6)
    const tile = withCta(gallery(5), true).find((t) => t.kind === 'cta')!
    expect(tile.ratio).toBe(CTA_RATIO)
    expect(CTA_RATIO).toBeCloseTo(4 / 3)
  })

  it('takes the next place when a project video stands at the middle (0 / 6 / 12)', () => {
    // 12 frames: the middle is frame 6, where the second video stands — the CTA right after it
    const tiles = keys(12, 3)
    expect(tiles.slice(6, 9)).toEqual(['f-p-3-5', 'r-2', 'cta'])
    expect(tiles[9]).toBe('f-p-3-6')
    // The video at 0 stays first
    expect(keys(4, 1)).toEqual(['r-1', 'f-p-3-0', 'f-p-3-1', 'cta', 'f-p-3-2', 'f-p-3-3'])
  })

  it('goes after the last frame with fewer than 3 frames', () => {
    expect(keys(1)).toEqual(['f-p-3-0', 'cta'])
    expect(keys(2, 2)).toEqual(['r-1', 'f-p-3-0', 'f-p-3-1', 'cta', 'r-2'])
    expect(ctaPlace(gallery(2))).toBe(2)
  })

  it('is left out without a CTA', () => {
    const tiles = gallery(5)
    expect(withCta(tiles, false)).toBe(tiles)
  })
})

describe('toWorkProject', () => {
  it('builds the page from the visible items in their order', () => {
    const page = toWorkProject(
      projectRow({ videos: [posterVideo, video], about: 'Первый.\n\nВторой.', price: 2300000 }),
      [
        viewRow(3, { videos: [posterVideo] }),
        viewRow(4, { hidden: true }),
        viewRow(5, { type: 'bathrooms', photos: [] }),
        viewRow(6, { type: 'hallways' }),
      ],
    )!
    expect(page.zones).toEqual([
      { id: 3, title: 'Кухня', count: 3, href: '/works/kvartira?item=3' },
      { id: 6, title: 'Прихожая', count: 2, href: '/works/kvartira?item=6' },
    ])
    expect(page.frames.map((f) => f.owner)).toEqual([3, 3, 3, 6, 6])
    // 4 photos + the item's video + one project video with a poster
    expect(page.meta).toEqual(['2 зоны', '4 фото + 2 видео', 'ЖК Уно, Москва, 2025'])
    expect(page.gallery[0]!.kind).toBe('reel')
    expect(page.gallery).toHaveLength(6)
    // «Весь проект» of the panel: the project itself
    expect(page.items[3]!.project).toEqual({ slug: 'kvartira', title: 'Квартира в тёплых тонах' })
    expect(page.description).toBe('Первый.')
    expect(page.about).toEqual({
      text: ['Первый.', 'Второй.'],
      price: formatPrice(2300000),
      designer: null,
    })
  })

  it('is null for a hidden, not complex project or one without visible items', () => {
    expect(toWorkProject(projectRow({ hidden: true }), [viewRow(3)])).toBeNull()
    expect(toWorkProject(projectRow({ complex: false }), [viewRow(3)])).toBeNull()
    expect(toWorkProject(projectRow(), [viewRow(3, { hidden: true })])).toBeNull()
    expect(toWorkProject(projectRow(), [])).toBeNull()
    expect(toWorkProject(null, [viewRow(3)])).toBeNull()
  })

  it('has «О проекте» only with a text, a price or a designer', () => {
    expect(projectAbout({ about: ' ', price: null, designer: ' ' })).toBeNull()
    expect(projectAbout({ about: null, price: 0, designer: null })).toEqual({
      text: [],
      price: formatPrice(0),
      designer: null,
    })
    expect(projectAbout({ about: null, price: null, designer: 'Анна' })?.designer).toBe('Анна')
  })
})

describe('index of projects', () => {
  const project = (id: number, extra: Partial<ProjectRow> = {}): ProjectRow => ({
    id,
    title: `Проект ${id}`,
    slug: `proekt-${id}`,
    place: null,
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

  it('keeps visible projects with visible items and their first item', () => {
    const projects = [
      project(1),
      project(2, { complex: false }),
      project(3, { hidden: true }),
      project(4),
    ]
    const items = [
      item(10, { project: 1, hidden: true }),
      item(11, { project: 1, type: 'bathrooms' }),
      item(12, { project: 1 }),
      item(20, { project: 2, type: 'hallways' }),
      item(30, { project: 3 }),
    ]
    const index = buildProjectIndex(projects, items)
    expect(index).toEqual([
      {
        id: 1,
        slug: 'proekt-1',
        title: 'Проект 1',
        complex: true,
        first: { id: 11, type: 'bathrooms' },
      },
      {
        id: 2,
        slug: 'proekt-2',
        title: 'Проект 2',
        complex: false,
        first: { id: 20, type: 'hallways' },
      },
    ])
    expect(index.map(projectHref)).toEqual(['/works/proekt-1', '/works?category=hallways&item=20'])
    expect(visibleProjectHrefs(index).get(2)).toBe('/works?category=hallways&item=20')
    // One read of the data for the feeds and the index
    const works = buildWorks(projects, items)
    expect(works.projects).toEqual(index)
    expect(works.feeds.complex.map((t) => t.key)).toEqual(['p-1'])
  })

  it('marks the home preview of a project (fetched ahead on an intent)', () => {
    const { feeds } = buildWorks([project(1)], [item(10, { project: 1 })])
    expect(toWorkPreview(feeds.complex[0]!).project).toBe(true)
    expect(toWorkPreview(feeds.kitchens[0]!).project).toBeUndefined()
  })
})

describe('Live Preview of a project', () => {
  const first = { id: 12, type: 'kitchens' }
  it('leads to the page, the first item or /works', () => {
    expect(projectPreviewPath({ slug: 'kvartira', complex: true }, first)).toBe('/works/kvartira')
    expect(projectPreviewPath({ slug: 'kvartira', complex: false }, first)).toBe(
      '/works?category=kitchens&item=12',
    )
    expect(projectPreviewPath({ slug: 'kvartira', complex: true }, null)).toBe('/works')
    expect(projectPreviewPath({ slug: 'kvartira', complex: true, hidden: true }, first)).toBe(
      '/works',
    )
    expect(projectPreviewPath({ slug: null }, first)).toBe('/works')
    expect(projectPreviewPath(null, null)).toBe('/works')
  })
})

describe('routes of a project page', () => {
  afterEach(resetRouteHistory)

  it('points the header «←» to the works', () => {
    expect(parentOf('/works/kvartira')).toEqual({ href: '/works', label: 'Все работы' })
    expect(parentOf('/works')).toEqual({ href: '/', label: 'На главную' })
  })

  it('keeps the route left, with its query', () => {
    trackRoute('/works', '')
    expect(previousRoute()).toBeNull()
    trackRoute('/works', 'category=kitchens&item=3')
    expect(previousRoute()).toBeNull()
    trackRoute('/works/kvartira', '')
    expect(previousRoute()).toEqual({ pathname: '/works', search: 'category=kitchens&item=3' })
    trackRoute('/works/kvartira', 'item=4')
    expect(previousRoute()).toEqual({ pathname: '/works', search: 'category=kitchens&item=3' })
  })
})

describe('project blocks', () => {
  const MESSENGERS = [
    { kind: 'max' as const, href: 'https://max.ru/u/x' },
    { kind: 'telegram' as const, href: 'https://t.me/x' },
  ]

  it('«О проекте»: text, price with its date, designer; empty parts left out', () => {
    const { container, unmount } = render(
      <ProjectAbout
        about={{ text: ['Первый.', 'Второй.'], price: '2 300 000 ₽', designer: 'анна' }}
        priceDate="октябрь 2026"
      />,
    )
    const section = screen.getByRole('region', { name: 'О проекте' })
    expect(within(section).getByText('2 300 000 ₽')).toBeTruthy()
    expect(within(section).getByText('Цена актуальна на октябрь 2026')).toBeTruthy()
    expect(within(section).getByText('Дизайнер проекта')).toBeTruthy()
    expect(within(section).getByText('А').getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelectorAll('hr')).toHaveLength(1)
    // No focusable element: its place below 768 differs from the DOM order
    expect(container.querySelectorAll('a, button, [tabindex]')).toHaveLength(0)
    unmount()

    const { container: textOnly } = render(
      <ProjectAbout
        about={{ text: ['Только текст.'], price: null, designer: null }}
        priceDate={null}
      />,
    )
    expect(textOnly.textContent).not.toContain('Стоимость проекта')
    expect(textOnly.textContent).not.toContain('Дизайнер проекта')
  })

  it('CTA: no title, no button label or no messenger — no tile', () => {
    const cta = { ctaTitle: 'Хотите так же?', ctaText: ' ', ctaButton: 'Оставить заявку' }
    expect(projectCta(cta, MESSENGERS)).toEqual({
      title: 'Хотите так же?',
      text: null,
      button: 'Оставить заявку',
    })
    expect(projectCta({ ...cta, ctaTitle: ' ' }, MESSENGERS)).toBeNull()
    expect(projectCta({ ...cta, ctaButton: null }, MESSENGERS)).toBeNull()
    expect(projectCta(cta, [])).toBeNull()
    expect(projectCta(undefined, MESSENGERS)).toBeNull()
  })

  it('CTA tile: the whole tile is the button of the choice, described by its title and text', () => {
    const cta = { title: 'Хотите так же?', text: 'Рассчитаем.', button: 'Оставить заявку' }
    const { container } = render(<ProjectCtaTile cta={cta} messengers={MESSENGERS} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Хотите так же?' })).toBeTruthy()
    const button = screen.getByRole('button', { name: /^Оставить заявку/ })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.getAttribute('aria-describedby')).toBe('project-cta-title project-cta-text')
    // The capsule is a picture of the button, not a control of its own
    expect(container.querySelectorAll('button')).toHaveLength(1)
    // A layout per width (the other one is `display: none`): the row of the narrow tile and the
    // capsule of the contact buttons on a wide one, whose button is only drawn
    const groups = () => screen.getAllByRole('group', { hidden: true })
    expect(groups()).toHaveLength(2)
    expect(groups().every((g) => g.hasAttribute('inert'))).toBe(true)
    const capsule = container.querySelector('.group\\/chooser')!
    expect(capsule.querySelector('span.chooser-motion[aria-hidden="true"]')).toBeTruthy()
    // The narrow row comes out from the left: --i counts from the first logo
    const narrow = groups()[0]!.querySelectorAll('a')
    expect([...narrow].map((a) => a.style.getPropertyValue('--i'))).toEqual(['0', '1'])
    expect([...narrow].every((a) => a.classList.contains('chooser-reveal'))).toBe(true)
    act(() => button.click())
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(button.getAttribute('aria-label')).toBe('Закрыть выбор мессенджера')
    expect(groups().some((g) => g.hasAttribute('inert'))).toBe(false)
  })

  it('CTA tile with one messenger is a link to it in a new tab', () => {
    const cta = { title: 'Хотите так же?', text: null, button: 'Оставить заявку' }
    render(<ProjectCtaTile cta={cta} messengers={[MESSENGERS[0]!]} />)
    const link = screen.getByRole('link', { name: /^Оставить заявку/ })
    expect(link.getAttribute('href')).toBe(MESSENGERS[0]!.href)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link.getAttribute('aria-describedby')).toBe('project-cta-title')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('«Весь проект →» closes the view on the page of the project', () => {
    const item = toViewerItem({
      ...viewRow(3),
      project: { id: 1, title: 'Квартира', slug: 'kvartira', complex: true, hidden: false },
    } as ViewerItemRow)!
    let closed = 0
    const { unmount } = render(
      <WorkViewPanel item={item} priceDate={null} messengers={[]} onProject={() => closed++} />,
    )
    const button = screen.getByRole('button', { name: /Весь проект/ })
    button.click()
    expect(closed).toBe(1)
    unmount()
    render(<WorkViewPanel item={item} priceDate={null} messengers={[]} />)
    expect(screen.getByRole('link', { name: /Весь проект/ }).getAttribute('href')).toBe(
      '/works/kvartira',
    )
  })
})
