import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ArticleCta } from '@/components/news/ArticleCta'
import { ArticleShare } from '@/components/news/ArticleShare'
import { NewsCard } from '@/components/news/NewsCard'
import { RelatedNews } from '@/components/news/RelatedNews'
import {
  NEWS_PAGE_SIZE,
  RELATED_NEWS_LIMIT,
  relatedNews,
  toNewsCard,
  type NewsCardData,
} from '@/lib/news'
import {
  articleShareLinks,
  checkMaxTemplate,
  maxShareUrl,
  telegramShareUrl,
  whatsappShareUrl,
} from '@/lib/shareLinks'

const DATA = {
  title: 'Новинки & скидки #1',
  url: 'https://mgs.example/news/novinki?x=1&y=2',
}
const enc = encodeURIComponent

describe('share links', () => {
  it('Telegram: the URL and the title, encoded', () => {
    expect(telegramShareUrl(DATA)).toBe(
      `https://t.me/share/url?url=${enc(DATA.url)}&text=${enc(DATA.title)}`,
    )
    expect(telegramShareUrl(DATA)).not.toMatch(/[ #]|&y=|скид/)
  })

  it('WhatsApp: the title and the URL in one encoded text', () => {
    expect(whatsappShareUrl(DATA)).toBe(`https://wa.me/?text=${enc(`${DATA.title} ${DATA.url}`)}`)
    expect(whatsappShareUrl(DATA)).toContain('%20https%3A%2F%2F')
  })

  it('MAX: {url} and {text} filled in, encoded, every occurrence', () => {
    expect(maxShareUrl('https://max.example/s?u={url}&t={text}&again={url}', DATA)).toBe(
      `https://max.example/s?u=${enc(DATA.url)}&t=${enc(DATA.title)}&again=${enc(DATA.url)}`,
    )
    expect(maxShareUrl('  https://max.example/{url}  ', DATA)).toBe(
      `https://max.example/${enc(DATA.url)}`,
    )
  })

  it('MAX: no template, or not a valid one — no link', () => {
    for (const template of [
      null,
      undefined,
      '',
      '   ',
      'https://max.example/s',
      'http://m/{url}',
      'max {url}',
    ])
      expect(maxShareUrl(template, DATA), String(template)).toBeNull()
  })

  it('the template check of the CMS field', () => {
    expect(checkMaxTemplate(null)).toBe(true)
    expect(checkMaxTemplate('')).toBe(true)
    expect(checkMaxTemplate('https://max.ru/share?text={text}%20{url}')).toBe(true)
    expect(checkMaxTemplate('https://max.ru/share?text={text}')).toMatch(/\{url\}/)
    expect(checkMaxTemplate('http://max.ru/share?u={url}')).toMatch(/https:\/\//)
    expect(checkMaxTemplate('max.ru/{url}')).toBe('Неверная ссылка')
  })

  it('in MESSENGER_ORDER: MAX · Telegram · WhatsApp, MAX only with a template', () => {
    expect(articleShareLinks(DATA, null).map((l) => l.kind)).toEqual(['telegram', 'whatsapp'])
    expect(articleShareLinks(DATA, 'https://max.example/{url}').map((l) => l.kind)).toEqual([
      'max',
      'telegram',
      'whatsapp',
    ])
  })
})

const card = (id: number): NewsCardData =>
  toNewsCard({
    id,
    title: `Новость ${id}`,
    slug: `novost-${id}`,
    type: 'news',
    date: '2026-02-19T12:00:00.000Z',
    lead: `Лид ${id}`,
    cover: 1,
  })

describe('«Ещё новости»', () => {
  const page = [1, 2, 3, 4, 5, 6].map(card)

  it('the latest without the current one, at most three', () => {
    expect(relatedNews(page, 2).map((n) => n.id)).toEqual([1, 3, 4])
    expect(relatedNews(page, 9).map((n) => n.id)).toEqual([1, 2, 3])
    expect(relatedNews(page.slice(0, 2), 1).map((n) => n.id)).toEqual([2])
    expect(relatedNews([card(1)], 1)).toEqual([])
  })

  it('the first page of the list keeps a full row after excluding the article', () => {
    expect(RELATED_NEWS_LIMIT).toBe(3)
    expect(NEWS_PAGE_SIZE).toBeGreaterThanOrEqual(RELATED_NEWS_LIMIT + 1)
  })

  it('H2 with «Все» → /news; cards with H3; the third hidden on tablet only', () => {
    render(<RelatedNews title="Ещё новости" items={relatedNews(page, 1)} />)
    const section = screen.getByRole('region', { name: 'Ещё новости' })
    expect(within(section).getByRole('link', { name: 'Все' }).getAttribute('href')).toBe('/news')
    expect(
      within(section)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Новость 2', 'Новость 3', 'Новость 4'])
    expect(within(section).getAllByRole('heading', { level: 2 })).toHaveLength(1)
    const items = within(section).getAllByRole('listitem')
    expect(items.map((li) => li.className)).toEqual(['', '', 'md:max-xl:hidden'])
  })

  it('no other news, or no title — no section', () => {
    const { container, rerender } = render(<RelatedNews title="Ещё новости" items={[]} />)
    expect(container.innerHTML).toBe('')
    rerender(<RelatedNews title="  " items={page} />)
    expect(container.innerHTML).toBe('')
  })

  it('NewsCard: H2 by default, H3 on request', () => {
    const { rerender } = render(<NewsCard item={card(1)} />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Новость 1')
    rerender(<NewsCard item={card(1)} heading="h3" />)
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('Новость 1')
  })
})

describe('ArticleCta', () => {
  const messengers = [
    { kind: 'telegram' as const, href: 'https://t.me/mgs' },
    { kind: 'whatsapp' as const, href: 'https://wa.me/7900' },
  ]
  const cta = {
    title: 'Хотите увидеть новинки вживую?',
    text: 'Приходите в салон.',
    primaryLabel: 'Найти салон',
    secondaryLabel: 'Рассчитать проект',
  }

  it('title, text, «Найти салон» → /salons and the contact button', () => {
    render(<ArticleCta cta={cta} messengers={messengers} />)
    const block = screen.getByRole('region', { name: cta.title })
    expect(within(block).getByText(cta.text)).toBeTruthy()
    expect(within(block).getByRole('link', { name: 'Найти салон' }).getAttribute('href')).toBe(
      '/salons',
    )
    expect(within(block).getByRole('button', { name: /Рассчитать проект/ })).toBeTruthy()
  })

  it('no title — no block; an empty label or no messengers — no button of its own', () => {
    const { container, rerender } = render(
      <ArticleCta cta={{ ...cta, title: ' ' }} messengers={messengers} />,
    )
    expect(container.innerHTML).toBe('')
    rerender(<ArticleCta cta={{ ...cta, primaryLabel: null }} messengers={[]} />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('ArticleShare', () => {
  const nav = navigator as unknown as Record<string, unknown>
  const original = nav.clipboard
  const stubClipboard = (value: unknown) =>
    Object.defineProperty(navigator, 'clipboard', { value, configurable: true, writable: true })
  const flush = () => act(() => Promise.resolve())
  const links = articleShareLinks(DATA, null)

  beforeEach(() => document.documentElement.style.setProperty('--share-status-time', '2s'))
  afterEach(() => {
    stubClipboard(original)
    document.documentElement.style.removeProperty('--share-status-time')
    vi.useRealTimers()
  })

  const copy = () => fireEvent.click(screen.getByRole('button', { name: 'Скопировать ссылку' }))
  const row = () => screen.getByRole('group', { name: 'Поделиться' })

  it('the messengers in order, new tab, then copy', () => {
    render(<ArticleShare url={DATA.url} links={links} />)
    const named = within(row())
      .getAllByRole('link')
      .map((a) => [a.getAttribute('aria-label'), a.getAttribute('target'), a.getAttribute('rel')])
    expect(named).toEqual([
      ['Поделиться в Telegram', '_blank', 'noopener noreferrer'],
      ['Поделиться в WhatsApp', '_blank', 'noopener noreferrer'],
    ])
    expect(row().textContent).toBe('Поделиться')
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('«Ссылка скопирована» for the token time, then the label; a press again restarts it', async () => {
    vi.useFakeTimers()
    const clipboard = { writeText: vi.fn(() => Promise.resolve()) }
    stubClipboard(clipboard)
    render(<ArticleShare url={DATA.url} links={links} />)
    copy()
    await flush()
    expect(clipboard.writeText).toHaveBeenCalledWith(DATA.url)
    expect(screen.getByRole('status').textContent).toBe('Ссылка скопирована')
    expect(row().textContent).toBe('Ссылка скопирована')
    act(() => vi.advanceTimersByTime(1500))
    copy()
    await flush()
    act(() => vi.advanceTimersByTime(1500))
    expect(screen.getByRole('status').textContent).toBe('Ссылка скопирована')
    act(() => vi.advanceTimersByTime(600))
    expect(screen.getByRole('status').textContent).toBe('')
    expect(row().textContent).toBe('Поделиться')
  })

  it('no clipboard, or it refuses: the link itself, kept', async () => {
    vi.useFakeTimers()
    stubClipboard(undefined)
    const { unmount } = render(<ArticleShare url={DATA.url} links={links} />)
    copy()
    expect(screen.getByRole('status').textContent).toBe(DATA.url)
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByRole('status').textContent).toBe(DATA.url)
    unmount()

    stubClipboard({ writeText: () => Promise.reject(new Error('NotAllowedError')) })
    render(<ArticleShare url={DATA.url} links={links} />)
    copy()
    await flush()
    expect(screen.getByRole('status').textContent).toBe(DATA.url)
  })
})
