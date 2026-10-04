import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AskAction } from '@/components/app/AskAction'
import { FloatingDock } from '@/components/app/FloatingDock'
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

  it('stays while focus is inside, whatever else', () => {
    expect(
      isDockVisible({ y: 0, vh: 1000, dir: 'down', footerVisible: true, focusWithin: true }),
    ).toBe(true)
  })
})

describe('AskAction', () => {
  const wa = { kind: 'whatsapp' as const, href: 'https://wa.me/79270963555' }
  const tg = { kind: 'telegram' as const, href: 'https://t.me/mgsmebel_official' }

  it('leads to WhatsApp in a new tab, named with the messenger', () => {
    render(<AskAction label="Спросить" action={wa} />)
    const link = screen.getByRole('link', { name: 'Спросить в WhatsApp' })
    expect(link.getAttribute('href')).toBe(wa.href)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link.textContent).toBe('Спросить')
  })

  it('leads to Telegram when there is no WhatsApp', () => {
    render(<AskAction label="Спросить" action={tg} />)
    expect(screen.getByRole('link', { name: 'Спросить в Telegram' }).getAttribute('href')).toBe(
      tg.href,
    )
  })

  it('renders nothing without a messenger or a label', () => {
    const { container, rerender } = render(<AskAction label="Спросить" />)
    expect(container.innerHTML).toBe('')
    rerender(<AskAction action={wa} />)
    expect(container.innerHTML).toBe('')
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
    const { container } = render(<FloatingDock askLabel="Спросить" />)
    expect(dock(container).hasAttribute('data-hidden')).toBe(true)
    expect(dock(container).hasAttribute('inert')).toBe(true)
    expect(screen.getByRole('button', { name: 'Наверх', hidden: true })).toBeTruthy()
    expect(screen.queryByRole('link', { hidden: true })).toBeNull()
  })

  it('shows on scrolling up, hides on scrolling down and next to the footer', async () => {
    const footer = document.body.appendChild(document.createElement('footer'))
    const { container } = render(
      <FloatingDock askLabel="Спросить" action={{ kind: 'whatsapp', href: 'https://wa.me/1' }} />,
    )
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

  it('ignores the jumps of the menu scroll lock', async () => {
    const { container } = render(<FloatingDock askLabel="Спросить" />)
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
    render(<FloatingDock />)
    fireEvent.click(screen.getByRole('button', { name: 'Наверх', hidden: true }))
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(document.activeElement).toBe(main)
    main.remove()
  })
})
