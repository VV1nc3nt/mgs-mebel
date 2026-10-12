import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppMenu, type MenuChrome } from '@/components/app/AppMenu'
import { MenuButton } from '@/components/app/MenuButton'
import { MenuProvider, PageRoot } from '@/components/app/MenuProvider'
import { BgVideoPlayer } from '@/components/ui/BgVideoPlayer'
import {
  initialMenu,
  menuReducer,
  transitionTime,
  type MenuAction,
  type MenuModel,
} from '@/hooks/useMenu'
import { lockScroll } from '@/hooks/useScrollLock'
import { toChrome } from '@/lib/chrome'
import { isOverlayOpen } from '@/lib/overlay'
import { globals } from '@/seed/data/globals'
import { intersect } from './setup'

const nav = vi.hoisted(() => ({ pathname: '/salons' }))
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }))

const run = (...actions: MenuAction[]): MenuModel => actions.reduce(menuReducer, initialMenu)

describe('menuReducer', () => {
  it('goes closed → opening → open → closing → closed', () => {
    expect(run({ type: 'open' }).state).toBe('opening')
    expect(run({ type: 'open' }, { type: 'opened' }).state).toBe('open')
    expect(run({ type: 'open' }, { type: 'opened' }, { type: 'close', reason: 'dismiss' })).toEqual(
      { state: 'closing', reason: 'dismiss' },
    )
    expect(
      run(
        { type: 'open' },
        { type: 'opened' },
        { type: 'close', reason: 'dismiss' },
        { type: 'closed' },
      ).state,
    ).toBe('closed')
  })

  it('closes from the middle of the opening animation', () => {
    expect(run({ type: 'open' }, { type: 'close', reason: 'dismiss' })).toEqual({
      state: 'closing',
      reason: 'dismiss',
    })
    // A late `opened` from the aborted opening does not undo the closing
    expect(
      run({ type: 'open' }, { type: 'close', reason: 'dismiss' }, { type: 'opened' }).state,
    ).toBe('closing')
  })

  it('ignores repeated clicks and repeated Esc', () => {
    expect(run({ type: 'open' }, { type: 'open' }).state).toBe('opening')
    expect(run({ type: 'open' }, { type: 'opened' }, { type: 'open' }).state).toBe('open')
    const closing = run({ type: 'open' }, { type: 'close', reason: 'dismiss' })
    expect(menuReducer(closing, { type: 'close', reason: 'navigate' })).toBe(closing)
    expect(menuReducer(initialMenu, { type: 'close', reason: 'dismiss' })).toBe(initialMenu)
    expect(menuReducer(initialMenu, { type: 'closed' })).toBe(initialMenu)
  })

  it('reopens during the closing animation', () => {
    expect(run({ type: 'open' }, { type: 'close', reason: 'dismiss' }, { type: 'open' })).toEqual({
      state: 'opening',
      reason: null,
    })
  })

  it('resets to closed without animation', () => {
    expect(run({ type: 'open' }, { type: 'reset' })).toEqual({ state: 'closed', reason: 'reset' })
    expect(menuReducer(initialMenu, { type: 'reset' })).toBe(initialMenu)
  })
})

describe('transitionTime', () => {
  it('takes the longest duration + delay from the computed style', () => {
    const el = document.createElement('div')
    el.style.transitionDuration = '0.45s, 220ms'
    el.style.transitionDelay = '0s, 300ms'
    expect(transitionTime(el)).toBe(520)
  })

  it('is 0 without transitions', () => {
    expect(transitionTime(document.createElement('div'))).toBe(0)
  })
})

describe('lockScroll', () => {
  let scrollTo: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 })
    scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })
  afterEach(() => scrollTo.mockRestore())

  it('hides the overflow in place, without moving the body, and releases it', () => {
    const release = lockScroll()
    const { documentElement: html, body } = document
    expect(html.style.overflow).toBe('hidden')
    expect(html.style.overscrollBehavior).toBe('none')
    expect(body.getAttribute('style')).toBeNull()
    expect(html.dataset.scrollLocked).toBe('')

    release({ toTop: false })
    expect(html.style.overflow).toBe('')
    expect(html.style.overscrollBehavior).toBe('')
    expect(html.dataset.scrollLocked).toBeUndefined()
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('leaves the page at the top when navigating away', () => {
    lockScroll()({ toTop: true })
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
    expect(document.documentElement.style.overflow).toBe('')
  })
})

describe('AppMenu', () => {
  const seed = globals(() => 0)
  const full = toChrome(seed.layout, seed.settings)
  const chrome = (over: Partial<MenuChrome> = {}): MenuChrome => ({
    nav: full.nav,
    phone: full.phone,
    messengers: full.messengers,
    menu: full.menu,
    ...over,
  })

  beforeEach(() => {
    nav.pathname = '/salons'
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  const setup = (data = chrome()) =>
    render(
      <MenuProvider>
        <PageRoot>
          <MenuButton />
          <main>page</main>
        </PageRoot>
        <AppMenu chrome={data} />
      </MenuProvider>,
    )

  const openMenu = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Открыть меню' }))
    return screen.getByRole('dialog', { name: 'Меню' })
  }

  it('is not in the DOM while closed; the button controls it only when open', () => {
    setup()
    const button = screen.getByRole('button', { name: 'Открыть меню' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.hasAttribute('aria-controls')).toBe(false)
  })

  it('opens with focus on the first item and the page inert', () => {
    const { container } = setup()
    const dialog = openMenu()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.activeElement?.textContent).toContain('О нас')
    expect(container.querySelector('main')?.closest('[inert]')).not.toBeNull()
    expect(document.documentElement.dataset.scrollLocked).toBe('')
  })

  it('uses full labels, marks the current section and numbers the items', () => {
    setup()
    const dialog = openMenu()
    const links = [...dialog.querySelectorAll('nav a')]
    expect(links.map((a) => a.textContent)).toEqual([
      '01О нас→',
      '02Фирменные салоны→',
      '03Наши работы→',
      '04Каталоги→',
      '05Дизайнерам→',
      '06Новости / новинки→',
    ])
    expect(dialog.querySelector('[aria-current="page"]')?.textContent).toContain('Фирменные салоны')
  })

  it('Esc returns focus to the menu button at once; the page stays locked until the end', async () => {
    const { container } = setup()
    openMenu()
    const scrollTo = vi.mocked(window.scrollTo)
    scrollTo.mockClear()
    fireEvent.keyDown(document, { key: 'Escape' })

    // Start of closing: focus and inert only
    const button = screen.getByRole('button', { name: 'Открыть меню' })
    expect(document.activeElement).toBe(button)
    expect(container.querySelector('[inert]')).toBe(screen.getByRole('dialog', { hidden: true }))
    expect(document.documentElement.dataset.scrollLocked).toBe('')
    expect(scrollTo).not.toHaveBeenCalled()

    // End of closing: unmounted and unlocked in the same commit; the page never moved
    await waitFor(() => expect(screen.queryByRole('dialog', { hidden: true })).toBeNull())
    expect(document.documentElement.dataset.scrollLocked).toBeUndefined()
    expect(document.documentElement.style.overflow).toBe('')
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('pauses background videos from the start of opening until closing has ended', async () => {
    render(
      <MenuProvider>
        <PageRoot>
          <MenuButton />
          <main>
            <BgVideoPlayer src="/api/media/file/hero.mp4" type="video/mp4" priority />
          </main>
        </PageRoot>
        <AppMenu chrome={chrome()} />
      </MenuProvider>,
    )
    await waitFor(() => expect(document.querySelector('video')).not.toBeNull())
    intersect(true)
    const play = vi.mocked(HTMLMediaElement.prototype.play)
    const pause = vi.mocked(HTMLMediaElement.prototype.pause)
    expect(play).toHaveBeenCalled()
    play.mockClear()
    pause.mockClear()

    // Opening: paused at once
    openMenu()
    expect(isOverlayOpen()).toBe(true)
    expect(pause).toHaveBeenCalledTimes(1)

    // Start of closing: still paused, not resumed
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeNull()
    expect(isOverlayOpen()).toBe(true)
    expect(play).not.toHaveBeenCalled()

    // Closed: plays again (it is in the viewport)
    await waitFor(() => expect(screen.queryByRole('dialog', { hidden: true })).toBeNull())
    // The menu leaves the DOM in the closing commit, the overlay flag clears in an effect after it
    await waitFor(() => expect(isOverlayOpen()).toBe(false))
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('does not resume a video outside the viewport after the menu closes', async () => {
    render(
      <MenuProvider>
        <PageRoot>
          <MenuButton />
          <main>
            <BgVideoPlayer src="/api/media/file/hero.mp4" type="video/mp4" priority />
          </main>
        </PageRoot>
        <AppMenu chrome={chrome()} />
      </MenuProvider>,
    )
    await waitFor(() => expect(document.querySelector('video')).not.toBeNull())
    intersect(false)
    const play = vi.mocked(HTMLMediaElement.prototype.play)
    play.mockClear()
    openMenu()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { hidden: true })).toBeNull())
    expect(play).not.toHaveBeenCalled()
  })

  it('switches the animation styles in the next frame, not in the closing commit', async () => {
    setup()
    openMenu()
    const dialog = screen.getByRole('dialog')
    await waitFor(() => expect(dialog.hasAttribute('data-shown')).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть меню' }))
    expect(dialog.hasAttribute('data-shown')).toBe(true)
    expect(dialog.hasAttribute('data-animating')).toBe(true)
    await waitFor(() => expect(dialog.hasAttribute('data-shown')).toBe(false))
  })

  it('keeps Tab inside the dialog', () => {
    setup()
    const dialog = openMenu()
    const focusable = [...dialog.querySelectorAll<HTMLElement>('a[href], button')]
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('a link to the current page only closes the menu', () => {
    setup()
    const dialog = openMenu()
    const current = dialog.querySelector<HTMLAnchorElement>('[aria-current="page"]')!
    // fireEvent returns false when the default (navigation) was prevented
    expect(fireEvent.click(current)).toBe(false)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Открыть меню' }))
  })

  it('shows the hotline and messengers in messenger order', () => {
    setup()
    const dialog = openMenu()
    expect(dialog.querySelector('a[href="tel:88001001658"]')?.textContent).toBe(
      'Бесплатная горячая линия8 800 100-16-58',
    )
    const messengers = [...dialog.querySelectorAll('ul.grid a')]
    expect(messengers.map((a) => a.getAttribute('aria-label'))).toEqual([
      'MAX',
      'Telegram',
      'WhatsApp',
    ])
    for (const a of messengers) expect(a.getAttribute('target')).toBe('_blank')
  })

  it('drops the bottom blocks without phone and messengers', () => {
    setup(chrome({ phone: undefined, messengers: [], menu: {} }))
    const dialog = openMenu()
    expect(dialog.querySelector('a[href^="tel:"]')).toBeNull()
    expect(dialog.querySelector('ul.grid')).toBeNull()
    expect(dialog.textContent).not.toContain('Бесплатная горячая линия')
    // Only sections, the logo and the close button remain
    expect(dialog.querySelectorAll('a[href], button')).toHaveLength(8)
  })

  it('never opens without sections', () => {
    setup(chrome({ nav: [] }))
    fireEvent.click(screen.getByRole('button', { name: 'Открыть меню' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
