import { describe, expect, it } from 'vitest'

import { contactLinkLabel, dockChooserLabel, MESSENGER_ORDER, toChrome } from '@/lib/chrome'
import { globals } from '@/seed/data/globals'

const seed = globals(() => 0)

describe('toChrome', () => {
  it('maps the seed globals', () => {
    const chrome = toChrome(seed.layout, seed.settings)
    expect(chrome.nav.map((i) => [i.href, i.label, i.shortLabel])).toEqual([
      ['/about', 'О нас', 'О нас'],
      ['/salons', 'Фирменные салоны', 'Салоны'],
      ['/works', 'Наши работы', 'Наши работы'],
      ['/catalogs', 'Каталоги', 'Каталоги'],
      ['/designers', 'Дизайнерам', 'Дизайнерам'],
      ['/news', 'Новости / новинки', 'Новости'],
    ])
    expect(chrome.phone).toEqual({ display: '8 800 100-16-58', href: 'tel:88001001658' })
    expect(chrome.messengers.map((m) => m.kind)).toEqual(['max', 'telegram', 'whatsapp'])
    expect(chrome.footer.sloganAccent).toBe('для жизни')
  })

  it('survives empty globals of a fresh database', () => {
    const chrome = toChrome({}, {})
    expect(chrome).toEqual({
      nav: [],
      phone: undefined,
      messengers: [],
      ctaLabel: undefined,
      menu: { hotlineLabel: undefined, messengersLabel: undefined },
      askLabel: undefined,
      footer: {
        sloganText: undefined,
        sloganAccent: undefined,
        hotlineLabel: undefined,
        copyright: undefined,
      },
    })
  })

  it('drops blank values and items without a label', () => {
    const chrome = toChrome(
      {
        nav: { news: { label: '  ' }, about: { label: 'О нас', shortLabel: '' } } as never,
        header: { ctaLabel: ' ' },
      },
      { contacts: { hotlinePhone: ' ' }, messengers: { max: '', telegram: null } },
    )
    expect(chrome.nav).toEqual([
      { key: 'about', href: '/about', label: 'О нас', shortLabel: 'О нас' },
    ])
    expect(chrome.ctaLabel).toBeUndefined()
    expect(chrome.phone).toBeUndefined()
    expect(chrome.messengers).toEqual([])
  })

  it('passes nothing beyond the chrome fields', () => {
    const chrome = toChrome(seed.layout, {
      ...seed.settings,
      technical: { consultantWidgetCode: '<script>x</script>' },
    } as never)
    expect(JSON.stringify(chrome)).not.toContain('script')
  })
})

describe('messengers', () => {
  it('come in one order, MAX · Telegram · WhatsApp, without blank links', () => {
    expect(MESSENGER_ORDER).toEqual(['max', 'telegram', 'whatsapp'])
    const { messengers } = toChrome(
      {},
      { messengers: { whatsapp: ' https://wa.me/1 ', telegram: ' ', max: 'https://max.ru/x' } },
    )
    expect(messengers).toEqual([
      { kind: 'max', href: 'https://max.ru/x' },
      { kind: 'whatsapp', href: 'https://wa.me/1' },
    ])
  })

  it('name the contact buttons', () => {
    expect(
      contactLinkLabel('Рассчитать проект', { kind: 'telegram', href: 'https://t.me/x' }),
    ).toBe('Рассчитать проект в Telegram')
    expect(dockChooserLabel('Спросить')).toBe('Спросить в мессенджере')
  })
})
