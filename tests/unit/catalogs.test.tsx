import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSyncExternalStore } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogCard } from '@/components/catalogs/CatalogCard'
import { CatalogsBrowser } from '@/components/catalogs/CatalogsBrowser'
import { catalogCategoryLabel, catalogCategoryOptions } from '@/lib/catalogCategories'
import { catalogCount, catalogMeta, formatFileSize } from '@/lib/catalogs'
import type { CatalogData } from '@/lib/queries'
import type { Catalog, Media } from '@/payload-types'
import { photo } from './fixtures'
import { env } from './setup'

// useSearchParams follows the URL replaced through history.replaceState, as in Next.js
const url = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  return {
    search: '',
    set(search: string) {
      this.search = search
      for (const listener of listeners) listener()
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
})
vi.mock('next/navigation', () => ({
  useSearchParams: () =>
    new URLSearchParams(
      useSyncExternalStore(
        (l) => url.subscribe(l),
        () => url.search,
        () => url.search,
      ),
    ),
}))

const MB = 1024 * 1024

describe('formatFileSize', () => {
  it('whole kilobytes below 1 MB, at least 1', () => {
    expect(formatFileSize(0)).toBe('1 КБ')
    expect(formatFileSize(684)).toBe('1 КБ')
    expect(formatFileSize(312 * 1024)).toBe('312 КБ')
    expect(formatFileSize(MB - 100)).toBe('1 МБ')
  })

  it('whole megabytes from 1 MB', () => {
    expect(formatFileSize(MB)).toBe('1 МБ')
    expect(formatFileSize(24 * MB)).toBe('24 МБ')
    expect(formatFileSize(24.6 * MB)).toBe('25 МБ')
  })
})

describe('catalogMeta and catalogCount', () => {
  it('pages with plural forms, then the file', () => {
    expect(catalogMeta(48, 24 * MB)).toBe('48 страниц · PDF, 24 МБ')
    expect(catalogMeta(1, 24 * MB)).toBe('1 страница · PDF, 24 МБ')
    expect(catalogMeta(64, 36 * MB)).toBe('64 страницы · PDF, 36 МБ')
  })

  it('without pages — the file only; without a size — «PDF»', () => {
    expect(catalogMeta(null, 24 * MB)).toBe('PDF, 24 МБ')
    expect(catalogMeta(64, null)).toBe('64 страницы · PDF')
    expect(catalogMeta(undefined, undefined)).toBe('PDF')
  })

  it('the counter: каталог / каталога / каталогов', () => {
    expect([1, 2, 5, 11, 21, 22].map(catalogCount)).toEqual([
      '1 каталог',
      '2 каталога',
      '5 каталогов',
      '11 каталогов',
      '21 каталог',
      '22 каталога',
    ])
  })
})

describe('catalogCategories', () => {
  it('the values of the CMS select, labels capitalised', () => {
    const values: Catalog['category'][] = catalogCategoryOptions.map((o) => o.value)
    expect(values).toEqual(['kitchens', 'wardrobes', 'facades', 'bathrooms', 'tables'])
    expect(catalogCategoryLabel('tables')).toBe('Столы и стулья')
    expect(catalogCategoryLabel('reels')).toBeUndefined()
    expect(catalogCategoryLabel(null)).toBeUndefined()
  })
})

const pdf: Media = {
  ...photo,
  id: 10,
  alt: null,
  url: '/api/media/file/kitchens.pdf',
  mimeType: 'application/pdf',
  filesize: 24 * MB,
  width: null,
  height: null,
  sizes: {},
}

const catalog = (over: Partial<CatalogData> = {}): CatalogData => ({
  id: 1,
  title: 'Кухни 2026',
  category: 'kitchens',
  cover: photo,
  render: null,
  pdf,
  pages: 96,
  order: 1,
  ...over,
})

describe('CatalogCard', () => {
  it('title, meta, the category badge and both links', () => {
    const { container } = render(<CatalogCard catalog={catalog()} />)
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('Кухни 2026')
    expect(screen.getByText('96 страниц · PDF, 24 МБ')).toBeTruthy()
    expect(screen.getByText('Кухни').className).toContain('lowercase')
    const view = screen.getByRole('link', { name: 'Смотреть каталог „Кухни 2026“' })
    expect(view.getAttribute('href')).toBe(pdf.url)
    expect(view.getAttribute('target')).toBe('_blank')
    expect(view.getAttribute('rel')).toBe('noopener noreferrer')
    const download = screen.getByRole('link', { name: 'Скачать PDF „Кухни 2026“' })
    expect(download.getAttribute('href')).toBe(pdf.url)
    expect(download.hasAttribute('download')).toBe(true)
    expect(download.hasAttribute('target')).toBe(false)
    // The mockup: the booklet with the cover photo and the title (hidden: the H3 says it)
    expect(container.querySelector('.catalog-booklet')).toBeTruthy()
    expect(screen.getByRole('img', { name: photo.alt! })).toBeTruthy()
  })

  it('without pages: the file only', () => {
    render(<CatalogCard catalog={catalog({ pages: null })} />)
    expect(screen.getByText('PDF, 24 МБ')).toBeTruthy()
  })

  it('a render replaces the mockup', () => {
    const render_ = { ...photo, id: 3, alt: 'Рендер каталога' }
    const { container } = render(<CatalogCard catalog={catalog({ render: render_ })} />)
    expect(container.querySelector('.catalog-booklet')).toBeNull()
    expect(screen.getByRole('img', { name: 'Рендер каталога' }).className).toContain(
      'object-contain',
    )
  })

  it('no PDF file — no buttons', () => {
    render(<CatalogCard catalog={catalog({ pdf: 10 })} />)
    expect(screen.queryAllByRole('link')).toEqual([])
  })
})

const ITEMS = [
  { value: 'all', label: 'все' },
  { value: 'kitchens', label: 'Кухни' },
  { value: 'wardrobes', label: 'Гардеробные' },
]
const CARDS = [
  { id: 1, category: 'kitchens', node: <article>Кухни 2026</article> },
  { id: 2, category: 'wardrobes', node: <article>Гардеробные системы</article> },
  { id: 3, category: 'wardrobes', node: <article>Шкафы-купе</article> },
]

const rect = (top: number) => ({ top, bottom: top, left: 0, right: 0 }) as DOMRect

describe('CatalogsBrowser (useSegmentFilter)', () => {
  let scrollTo: ReturnType<typeof vi.spyOn>
  let replaceState: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    url.search = ''
    scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    replaceState = vi
      .spyOn(window.history, 'replaceState')
      .mockImplementation((_data, _unused, next) => {
        act(() => url.set(new URL(String(next), window.location.href).search))
      })
  })
  afterEach(() => {
    scrollTo.mockRestore()
    replaceState.mockRestore()
    document.documentElement.removeAttribute('data-header-pinned')
    document.documentElement.style.removeProperty('--header-h')
  })

  const bar = () => screen.getByRole('group', { name: 'Категории каталогов' })
  const count = () => screen.getByText(/каталог/, { selector: 'p[aria-live]' }).textContent

  it('a sticky bar in the z-index scale, lowercase labels, the counter', () => {
    const { container } = render(<CatalogsBrowser items={ITEMS} cards={CARDS} />)
    const sticky = container.querySelector('.sticky-under-header')!
    expect(sticky.className).toContain('z-sticky')
    expect(sticky.className).not.toContain('z-10')
    expect(within(bar()).getByRole('button', { name: 'Кухни' }).className).toContain('lowercase')
    expect(count()).toBe('3 каталога')
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('the category from the URL; unknown values show all', () => {
    url.search = '?category=wardrobes'
    const { unmount } = render(<CatalogsBrowser items={ITEMS} cards={CARDS} />)
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(count()).toBe('2 каталога')
    unmount()
    url.search = '?category=bathrooms'
    render(<CatalogsBrowser items={ITEMS} cards={CARDS} />)
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('a choice replaces the URL; «все» removes the parameter', async () => {
    render(<CatalogsBrowser items={ITEMS} cards={CARDS} />)
    await userEvent.click(within(bar()).getByRole('button', { name: 'Кухни' }))
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/?category=kitchens')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(count()).toBe('1 каталог')
    await userEvent.click(within(bar()).getByRole('button', { name: 'все' }))
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/')
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('the bar in its place: the page does not scroll', async () => {
    const { container } = render(<CatalogsBrowser items={ITEMS} cards={CARDS} />)
    const sentinel = container.firstElementChild!.firstElementChild!
    vi.spyOn(sentinel, 'getBoundingClientRect').mockReturnValue(rect(300))
    vi.spyOn(container.querySelector('.sticky-under-header')!, 'getBoundingClientRect')
      .mockReturnValue(rect(300))
    await userEvent.click(within(bar()).getByRole('button', { name: 'Кухни' }))
    expect(scrollTo).not.toHaveBeenCalled()
  })

  for (const [reduced, behavior] of [
    [false, 'smooth'],
    [true, 'auto'],
  ] as const) {
    it(`the bar stuck: to the start of the list (${behavior})`, async () => {
      env.reducedMotion = reduced
      const root = document.documentElement
      root.style.setProperty('--header-h', '80')
      root.setAttribute('data-header-pinned', '')
      const { container } = render(<CatalogsBrowser items={ITEMS} cards={CARDS} />)
      const sentinel = container.firstElementChild!.firstElementChild!
      // The bar's own place 1000 px above the viewport, the bar under the pinned header
      vi.spyOn(sentinel, 'getBoundingClientRect').mockReturnValue(rect(-1000.25))
      vi.spyOn(container.querySelector('.sticky-under-header')!, 'getBoundingClientRect')
        .mockReturnValue(rect(80))
      window.scrollY = 1400
      await userEvent.click(within(bar()).getByRole('button', { name: 'Кухни' }))
      // 1400 − 1000.25 − 80, rounded up
      expect(scrollTo).toHaveBeenCalledWith({ top: 320, behavior })
      // Scroll anchoring is off until the scroll ends
      expect(root.style.getPropertyValue('overflow-anchor')).toBe('none')
      window.dispatchEvent(new Event('scrollend'))
      expect(root.style.getPropertyValue('overflow-anchor')).toBe('')
    })
  }
})
