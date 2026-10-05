import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AskAction } from '@/components/app/AskAction'
import { FloatingDock } from '@/components/app/FloatingDock'
import { closeChooser, openChooser } from '@/lib/chooser'
import { isDockVisible, type DockInput } from '@/lib/dockVisibility'
import { initialScroll, nextScroll } from '@/lib/scrollDirection'

import { intersect } from './setup'

describe('nextScroll', () => {
  const start = initialScroll(1000)

  it('starts as if the last move was up', () => {
    expect(start).toEqual({ lastY: 1000, dir: 'up' })
  })

  it('ignores moves up to 6px, turns after more than 6px', () => {
    expect(nextScroll(start, 1005)).toBe(start)
    expect(nextScroll(start, 1006)).toBe(start)
    expect(nextScroll(start, 1007)).toEqual({ lastY: 1007, dir: 'down' })
    const down = { lastY: 1000, dir: 'down' as const }
    expect(nextScroll(down, 994)).toBe(down)
    expect(nextScroll(down, 993)).toEqual({ lastY: 993, dir: 'up' })
  })

  it('measures from the last turning point, so slow scrolling adds up', () => {
    let s = start
    for (const y of [1003, 1006]) s = nextScroll(s, y)
    expect(s.dir).toBe('up')
    expect(nextScroll(s, 1009)).toEqual({ lastY: 1009, dir: 'down' })
  })
})

describe('isDockVisible', () => {
  const base: DockInput = { y: 800, vh: 1000, dir: 'up', footerVisible: false, focusWithin: false }

  it('shows while scrolling up past the first screen', () => {
    expect(isDockVisible(base)).toBe(true)
  })

  it('hides on the first screen (scrollY < 0.7·vh)', () => {
    expect(isDockVisible({ ...base, y: 699 })).toBe(false)
    expect(isDockVisible({ ...base, y: 700 })).toBe(true)
  })

  it('hides while scrolling down', () => {
    expect(isDockVisible({ ...base, dir: 'down' })).toBe(false)
  })

  it('hides next to the footer', () => {
    expect(isDockVisible({ ...base, footerVisible: true })).toBe(false)
  })

  it('stays while the messenger choice is open', () => {
    expect(isDockVisible({ ...base, dir: 'down', footerVisible: true, chooserOpen: true })).toBe(
      true,
    )
  })

  it('stays while focus is inside, whatever else', () => {
    expect(
      isDockVisible({ y: 0, vh: 1000, dir: 'down', footerVisible: true, focusWithin: true }),
    ).toBe(true)
  })
})

const MAX = { kind: 'max' as const, href: 'https://max.ru/join/x' }
const TG = { kind: 'telegram' as const, href: 'https://t.me/mgsmebel_official' }
const WA = { kind: 'whatsapp' as const, href: 'https://wa.me/79270963555' }

describe('AskAction', () => {
  it('one messenger: a link in a new tab, named with the messenger, without aria-expanded', () => {
    render(<AskAction label="Спросить" messengers={[TG]} />)
    const link = screen.getByRole('link', { name: 'Спросить в Telegram' })
    expect(link.getAttribute('href')).toBe(TG.href)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link.hasAttribute('aria-expanded')).toBe(false)
    expect(link.textContent).toBe('Спросить')
  })

  it('two or three messengers: the button of the choice', () => {
    const { rerender } = render(<AskAction label="Спросить" messengers={[MAX, WA]} />)
    const button = screen.getByRole('button', { name: 'Спросить в мессенджере' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    rerender(<AskAction label="Спросить" messengers={[MAX, TG, WA]} open />)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(button.getAttribute('aria-label')).toBe('Закрыть выбор мессенджера')
  })

  it('renders nothing without a messenger', () => {
    const { container } = render(<AskAction label="Спросить" messengers={[]} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('FloatingDock choice', () => {
  afterEach(() => act(() => closeChooser()))

  const setup = (messengers = [MAX, TG, WA]) => {
    const view = render(<FloatingDock askLabel="Спросить" messengers={messengers} />)
    const root = view.container.firstElementChild as HTMLElement
    const button = () => screen.getByRole('button', { name: /мессенджер/, hidden: true })
    const group = () => screen.getByRole('group', { name: 'Спросить в мессенджере', hidden: true })
    return { ...view, root, button, group }
  }

  it('0 messengers: only «Наверх»', () => {
    setup([])
    expect(
      screen.getAllByRole('button', { hidden: true }).map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Наверх'])
    expect(screen.queryByRole('group', { hidden: true })).toBeNull()
  })

  it('1 messenger: «Спросить» is a link, no choice', () => {
    setup([WA])
    expect(screen.getByRole('link', { name: 'Спросить в WhatsApp', hidden: true })).toBeTruthy()
    expect(screen.queryByRole('group', { hidden: true })).toBeNull()
  })

  it('3 messengers: logos MAX · Telegram · WhatsApp, folded and inert until opened', () => {
    const { root, button, group } = setup()
    const links = [...group().querySelectorAll('a')]
    expect(links.map((a) => a.getAttribute('aria-label'))).toEqual(['MAX', 'Telegram', 'WhatsApp'])
    expect(links.map((a) => a.getAttribute('href'))).toEqual([MAX.href, TG.href, WA.href])
    for (const a of links) {
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toBe('noopener noreferrer')
    }
    expect(group().hasAttribute('inert')).toBe(true)
    expect(button().getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(button())
    expect(root.hasAttribute('data-open')).toBe(true)
    expect(button().getAttribute('aria-expanded')).toBe('true')
    expect(button().getAttribute('aria-label')).toBe('Закрыть выбор мессенджера')
    expect(group().hasAttribute('inert')).toBe(false)
    // «Наверх» folds away
    const up = screen.getByRole('button', { name: 'Наверх', hidden: true })
    expect(up.closest('[inert]')).not.toBeNull()

    fireEvent.click(button())
    expect(root.hasAttribute('data-open')).toBe(false)
  })

  it('stagger runs from «×»: WhatsApp first, MAX last', () => {
    const { group } = setup()
    const order = [...group().querySelectorAll('a')].map((a) => a.style.getPropertyValue('--i'))
    expect(order).toEqual(['2', '1', '0'])
  })

  it('Esc closes and returns focus to the button; a click outside closes', () => {
    const { root, button } = setup()
    fireEvent.click(button())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(root.hasAttribute('data-open')).toBe(false)
    expect(document.activeElement).toBe(button())

    fireEvent.click(button())
    fireEvent.pointerDown(document.body)
    expect(root.hasAttribute('data-open')).toBe(false)
  })

  it('a chosen link closes the choice', () => {
    const { root, button, group } = setup()
    fireEvent.click(button())
    fireEvent.click(group().querySelector('a')!)
    expect(root.hasAttribute('data-open')).toBe(false)
  })

  it('from the keyboard: focus on MAX, arrows go round', async () => {
    const { button, group } = setup()
    // Enter / Space click: detail 0
    fireEvent.click(button(), { detail: 0 })
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))
    const [max, , wa] = [...group().querySelectorAll('a')]
    expect(document.activeElement).toBe(max)
    fireEvent.keyDown(max!, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(button())
    fireEvent.keyDown(button(), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(wa)
    fireEvent.keyDown(wa!, { key: 'Home' })
    expect(document.activeElement).toBe(max)
  })

  it('closing with focus on a logo (scroll, menu) moves focus to the button', async () => {
    const { button, group } = setup()
    fireEvent.click(button(), { detail: 0 })
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))
    expect(group().contains(document.activeElement)).toBe(true)
    act(() => closeChooser())
    expect(document.activeElement).toBe(button())
  })

  it('a pointer click does not move focus', async () => {
    const { button } = setup()
    fireEvent.click(button(), { detail: 1 })
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))
    expect(document.activeElement).toBe(document.body)
  })

  it('another choice or the menu (closeChooser) closes it', () => {
    const { root, button } = setup()
    fireEvent.click(button())
    act(() => openChooser('other'))
    expect(root.hasAttribute('data-open')).toBe(false)
    fireEvent.click(button())
    act(() => closeChooser())
    expect(root.hasAttribute('data-open')).toBe(false)
  })
})

describe('FloatingDock', () => {
  const setScroll = (y: number) => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: y })
    fireEvent.scroll(window)
  }
  const frame = () => act(() => new Promise((resolve) => requestAnimationFrame(resolve)))

  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 })
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 5000,
    })
    document.documentElement.removeAttribute('data-scroll-locked')
  })

  const dock = (container: HTMLElement) => container.firstElementChild as HTMLElement

  it('is hidden and inert on the first screen, «Спросить» only with a messenger', () => {
    const { container } = render(<FloatingDock askLabel="Спросить" messengers={[]} />)
    expect(dock(container).hasAttribute('data-hidden')).toBe(true)
    expect(dock(container).hasAttribute('inert')).toBe(true)
    expect(screen.getByRole('button', { name: 'Наверх', hidden: true })).toBeTruthy()
    expect(screen.queryByRole('link', { hidden: true })).toBeNull()
  })

  it('shows on scrolling up, hides on scrolling down and next to the footer', async () => {
    const footer = document.body.appendChild(document.createElement('footer'))
    const { container } = render(<FloatingDock askLabel="Спросить" messengers={[WA]} />)
    setScroll(2000)
    await frame()
    expect(dock(container).hasAttribute('data-hidden')).toBe(true)
    setScroll(1900)
    await frame()
    expect(dock(container).hasAttribute('data-hidden')).toBe(false)
    expect(dock(container).hasAttribute('inert')).toBe(false)
    act(() => intersect(true))
    expect(dock(container).hasAttribute('data-hidden')).toBe(true)
    footer.remove()
  })

  it('an open choice keeps the dock; a scroll of more than 6px closes it', async () => {
    const footer = document.body.appendChild(document.createElement('footer'))
    const { container } = render(<FloatingDock askLabel="Спросить" messengers={[MAX, TG]} />)
    setScroll(2000)
    await frame()
    setScroll(1900)
    await frame()
    fireEvent.click(screen.getByRole('button', { name: 'Спросить в мессенджере' }), { detail: 1 })
    expect(dock(container).hasAttribute('data-open')).toBe(true)
    setScroll(1906)
    await frame()
    expect(dock(container).hasAttribute('data-open')).toBe(true)
    act(() => intersect(true))
    expect(dock(container).hasAttribute('data-hidden')).toBe(false)
    setScroll(1920)
    await frame()
    expect(dock(container).hasAttribute('data-open')).toBe(false)
    expect(dock(container).hasAttribute('data-hidden')).toBe(true)
    footer.remove()
  })

  it('ignores the jumps of the menu scroll lock', async () => {
    const { container } = render(<FloatingDock askLabel="Спросить" messengers={[]} />)
    setScroll(2000)
    await frame()
    setScroll(1900)
    await frame()
    document.documentElement.setAttribute('data-scroll-locked', '')
    setScroll(0)
    await frame()
    expect(dock(container).hasAttribute('data-hidden')).toBe(false)
  })

  it('«Наверх» scrolls to the top and moves focus to the start of the page', () => {
    const main = document.createElement('main')
    main.id = 'content'
    main.tabIndex = -1
    document.body.append(main)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    render(<FloatingDock messengers={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Наверх', hidden: true }))
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(document.activeElement).toBe(main)
    main.remove()
  })
})
