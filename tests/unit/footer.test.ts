import { describe, expect, it } from 'vitest'

import { toChrome } from '@/lib/chrome'
import { checkFooterHref, toCookieTexts, toFooter, type FooterInput } from '@/lib/footer'
import { globals } from '@/seed/data/globals'

const seed = globals(() => 0)

const input = (patch: Partial<FooterInput> = {}): FooterInput => {
  const chrome = toChrome(seed.layout, seed.settings)
  return {
    layout: seed.layout,
    settings: seed.settings,
    nav: chrome.nav,
    phone: chrome.phone,
    messengers: chrome.messengers,
    salons: [{ name: 'Пражская', address: 'Кировоградская, 15' }],
    legal: {},
    ...patch,
  }
}

describe('checkFooterHref', () => {
  it('accepts own paths and https only', () => {
    expect(checkFooterHref('/salons')).toBe(true)
    expect(checkFooterHref('https://example.com/a')).toBe(true)
    expect(checkFooterHref('//evil.com')).not.toBe(true)
    expect(checkFooterHref('http://example.com')).not.toBe(true)
    expect(checkFooterHref('javascript:alert(1)')).not.toBe(true)
    expect(checkFooterHref('salons')).not.toBe(true)
  })
})

describe('toFooter', () => {
  it('maps the seed: columns with links, no buyers column, the copyright', () => {
    const f = toFooter(input())
    expect(f.columns.menu?.title).toBe('Меню')
    expect(f.columns.menu?.items).toHaveLength(6)
    expect(f.columns.buyers).toBeUndefined()
    expect(f.columns.salons?.items).toEqual([{ name: 'Пражская', address: 'Кировоградская, 15' }])
    expect(f.columns.contacts).toEqual({ title: 'Контакты' })
    expect(f.contact).toEqual({
      title: 'Расскажем о сроках и стоимости',
      buttonLabel: 'Рассчитать проект',
    })
    expect(f.legal).toEqual({
      owner: 'MGS MEBEL. Все права защищены.',
      ids: [],
      address: undefined,
    })
    expect(f.links).toEqual([])
  })

  it('drops columns without a title or without items, and bad buyer links', () => {
    const layout = {
      ...seed.layout,
      footer: {
        ...seed.layout.footer,
        menuTitle: ' ',
        buyerLinks: [
          { label: 'Доставка', href: '/delivery' },
          { label: 'Чужой', href: 'http://example.com' },
          { label: ' ', href: '/x' },
        ],
      },
    }
    const f = toFooter(input({ layout, salons: [{ name: ' ', address: 'x' }] }))
    expect(f.columns.menu).toBeUndefined()
    expect(f.columns.salons).toBeUndefined()
    expect(f.columns.buyers?.items).toEqual([{ label: 'Доставка', href: '/delivery' }])
  })

  it('requisites replace the copyright; empty parts are left out', () => {
    const f = toFooter(
      input({
        settings: {
          ...seed.settings,
          requisites: { company: 'ООО «МГС»', inn: null, ogrn: '1027700000000', hours: ' 9–21 ' },
        },
      }),
    )
    expect(f.legal).toEqual({ owner: 'ООО «МГС»', ids: ['ОГРН 1027700000000'], address: undefined })
    expect(f.contacts.hours).toBe('9–21')
  })

  it('legal links: privacy and offer, in this order, only published ones', () => {
    const f = toFooter(
      input({
        legal: {
          offer: { href: '/offer', title: 'Оферта' },
          cookies: { href: '/cookies', title: 'Cookies' },
        },
      }),
    )
    expect(f.links).toEqual([{ href: '/offer', title: 'Оферта' }])
  })

  it('no contact button without messengers; no block without title and button', () => {
    expect(toFooter(input({ messengers: [] })).contact).toEqual({
      title: 'Расскажем о сроках и стоимости',
      buttonLabel: undefined,
    })
    const layout = { ...seed.layout, footer: { ...seed.layout.footer, contact: { title: '' } } }
    expect(toFooter(input({ layout, messengers: [] })).contact).toBeUndefined()
  })

  it('a contacts column needs a title and something to show', () => {
    expect(
      toFooter(input({ phone: undefined, messengers: [], settings: {} })).columns.contacts,
    ).toBeUndefined()
  })
})

describe('toCookieTexts', () => {
  const cookies = seed.layout.cookies!
  it('all or nothing: the text and three labels', () => {
    expect(toCookieTexts(seed.layout, {})).toEqual({
      lead: 'Мы используем cookies',
      text: '— чтобы сайт работал корректно и становился лучше.',
      more: undefined,
      reject: 'Отказаться',
      necessary: 'Только необходимые',
      accept: 'Принять все',
    })
    for (const key of ['lead', 'text', 'rejectLabel', 'necessaryLabel', 'acceptLabel'] as const) {
      expect(toCookieTexts({ cookies: { ...cookies, [key]: ' ' } }, {})).toBeUndefined()
    }
    expect(toCookieTexts({}, {})).toBeUndefined()
  })

  it('«Подробнее» only with a published policy and a label', () => {
    const legal = { cookies: { href: '/cookies', title: 'Политика cookies' } }
    expect(toCookieTexts(seed.layout, legal)?.more).toEqual({
      label: 'Подробнее',
      href: '/cookies',
    })
    expect(toCookieTexts({ cookies: { ...cookies, moreLabel: null } }, legal)?.more).toBeUndefined()
  })
})
