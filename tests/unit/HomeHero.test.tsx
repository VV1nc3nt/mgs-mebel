import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HomeHero } from '@/components/home/HomeHero'
import { setOverlay } from '@/lib/overlay'
import { photo, video } from './fixtures'
import { intersect } from './setup'

const slides = [
  { label: 'о нас', title: 'Дизайнерская мебель', text: 'Мебельная фабрика.', poster: photo, video },
  { label: 'наши возможности', title: 'Производство полного цикла', poster: photo },
]
const hero = { ctaLabel: 'Рассчитать проект', linkLabel: 'Подробнее о компании', slides }
const whatsapp = { kind: 'whatsapp' as const, href: 'https://wa.me/79270963555' }

const section = (container: HTMLElement) => container.querySelector('section[data-hero]')!
const texts = (container: HTMLElement) => [...container.querySelectorAll('.hero-text')]
const active = (container: HTMLElement) =>
  texts(container).findIndex((block) => !block.hasAttribute('data-inactive'))
/** The mobile progress fill of the active segment (the rail is hidden by CSS, not in jsdom). */
const progress = (container: HTMLElement) =>
  texts(container)[active(container)]!.querySelector('.hero-progress-x')!

describe('HomeHero', () => {
  it('is not rendered without a title in segment 01', () => {
    const empty = { ...hero, slides: [{ ...slides[0]!, title: ' ' }, slides[1]!] }
    expect(render(<HomeHero hero={empty} messengers={[whatsapp]} />).container.innerHTML).toBe('')
    expect(render(<HomeHero hero={undefined} messengers={[]} />).container.innerHTML).toBe('')
    expect(render(<HomeHero hero={{ slides: [] }} messengers={[]} />).container.innerHTML).toBe('')
  })

  it('one segment: a plain hero without controls, CTA and link', () => {
    const { container } = render(
      <HomeHero hero={{ ...hero, slides: [slides[0]!] }} messengers={[whatsapp]} />,
    )
    expect(section(container).getAttribute('aria-labelledby')).toBe('home-hero-title')
    expect(section(container).hasAttribute('aria-roledescription')).toBe(false)
    expect(screen.getByRole('heading', { level: 1 }).id).toBe('home-hero-title')
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Следующий раздел' })).toBeNull()
    expect(container.querySelector('.hero-progress')).toBeNull()
    expect(screen.getByRole('link', { name: 'Рассчитать проект в WhatsApp' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Подробнее о компании/ }).getAttribute('href')).toBe(
      '/about',
    )
  })

  it('no CTA without a label or messengers; no link without its label', () => {
    render(<HomeHero hero={{ ...hero, ctaLabel: '', linkLabel: null }} messengers={[whatsapp]} />)
    expect(screen.queryByRole('link')).toBeNull()
    render(<HomeHero hero={hero} messengers={[]} />)
    expect(screen.queryByRole('link', { name: /Рассчитать проект/ })).toBeNull()
  })

  it('two segments: H1 and H2 in the HTML, the second hidden and inert', () => {
    const { container } = render(<HomeHero hero={hero} messengers={[whatsapp]} />)
    expect(section(container).getAttribute('aria-roledescription')).toBe('карусель')
    expect(section(container).getAttribute('aria-label')).toBe('О компании')
    const [first, second] = texts(container)
    expect(first!.querySelector('h1')?.textContent).toBe('Дизайнерская мебель')
    expect(second!.querySelector('h2')?.textContent).toBe('Производство полного цикла')
    expect(second!.getAttribute('aria-hidden')).toBe('true')
    expect(second!.hasAttribute('inert')).toBe(true)
    expect(second!.getAttribute('aria-label')).toBe('2 из 2')
    expect(first!.hasAttribute('aria-hidden')).toBe(false)
    // Posters: 01 — LCP (high), 02 — low, in the viewport under opacity 0
    const images = section(container).querySelectorAll('img')
    expect(images[0]!.getAttribute('fetchpriority')).toBe('high')
    expect(images[1]!.getAttribute('fetchpriority')).toBe('low')
  })

  it('tabs: click, → / ↓ forward, ← / ↑ back, going round; roving tabindex', () => {
    const { container } = render(<HomeHero hero={hero} messengers={[whatsapp]} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.getAttribute('aria-label'))).toEqual(['01 о нас', '02 наши возможности'])
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1])

    fireEvent.keyDown(tabs[0]!, { key: 'ArrowDown' })
    expect(active(container)).toBe(1)
    expect(document.activeElement).toBe(tabs[1])
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true')
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0])
    fireEvent.keyDown(tabs[1]!, { key: 'ArrowRight' })
    expect(active(container)).toBe(0)
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowLeft' })
    expect(active(container)).toBe(1)
    fireEvent.keyDown(tabs[1]!, { key: 'ArrowUp' })
    expect(active(container)).toBe(0)
    fireEvent.click(tabs[1]!)
    expect(active(container)).toBe(1)
  })

  it('switches to the next segment when the progress ends, and goes on after a manual switch', () => {
    const { container } = render(<HomeHero hero={hero} messengers={[whatsapp]} />)
    const live = container.querySelector('[aria-live]')!
    expect(live.getAttribute('aria-live')).toBe('off')

    const before = progress(container)
    fireEvent.animationEnd(before)
    expect(active(container)).toBe(1)
    expect(live.getAttribute('aria-live')).toBe('off')
    // A new element: the animation starts again
    expect(progress(container)).not.toBe(before)

    fireEvent.click(screen.getAllByRole('button', { name: 'Следующий раздел' })[0]!)
    expect(active(container)).toBe(0)
    expect(live.getAttribute('aria-live')).toBe('polite')
    const manual = progress(container)
    fireEvent.click(screen.getAllByRole('button', { name: 'Предыдущий раздел' })[0]!)
    expect(active(container)).toBe(1)
    // A manual switch restarts the progress too; automatic switching goes on
    expect(progress(container)).not.toBe(manual)
    fireEvent.animationEnd(progress(container))
    expect(active(container)).toBe(0)
  })

  it('mobile progress: in each block above the label, «01 … 02» with the own number lit', () => {
    const { container } = render(<HomeHero hero={hero} messengers={[whatsapp]} />)
    texts(container).forEach((block, i) => {
      const row = block.firstElementChild!
      expect(row.getAttribute('aria-hidden')).toBe('true')
      expect(row.nextElementSibling?.textContent).toBe(`#${slides[i]!.label}`)
      const [first, , last] = [...row.children]
      expect([first!.textContent, last!.textContent]).toEqual(['01', '02'])
      expect([first, last].map((n) => n!.classList.contains('text-accent'))).toEqual([
        i === 0,
        i === 1,
      ])
    })
  })

  it('the outgoing fill stays (frozen, fading out); only the active one switches', () => {
    const { container } = render(<HomeHero hero={hero} messengers={[whatsapp]} />)
    const outgoing = progress(container)
    fireEvent.animationEnd(outgoing)
    expect(active(container)).toBe(1)
    // The same element in the now inactive block: no remount, so no jump to empty
    expect(texts(container)[0]!.querySelector('.hero-progress-x')).toBe(outgoing)
    // Its animationend does nothing
    fireEvent.animationEnd(outgoing)
    expect(active(container)).toBe(1)
  })

  it('pauses the progress off screen, in a hidden tab and under an overlay', () => {
    const { container } = render(<HomeHero hero={hero} messengers={[whatsapp]} />)
    const root = section(container)
    expect(root.hasAttribute('data-paused')).toBe(false)
    act(() => intersect(false))
    expect(root.hasAttribute('data-paused')).toBe(true)
    act(() => intersect(true))
    expect(root.hasAttribute('data-paused')).toBe(false)
    act(() => setOverlay('menu', true))
    expect(root.hasAttribute('data-paused')).toBe(true)
    act(() => setOverlay('menu', false))
    expect(root.hasAttribute('data-paused')).toBe(false)
  })

  it('wheel at the top: one step, the event is cancelled; not while the menu is open', () => {
    const { container } = render(<HomeHero hero={hero} messengers={[whatsapp]} />)
    act(() => setOverlay('menu', true))
    const blocked = new WheelEvent('wheel', { deltaY: 100, cancelable: true })
    act(() => {
      window.dispatchEvent(blocked)
    })
    expect(blocked.defaultPrevented).toBe(false)
    expect(active(container)).toBe(0)
    act(() => setOverlay('menu', false))

    const event = new WheelEvent('wheel', { deltaY: 100, cancelable: true })
    act(() => {
      window.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true)
    expect(active(container)).toBe(1)
  })

  it('keys: not taken from focused controls or with modifiers', () => {
    const { container } = render(<HomeHero hero={hero} messengers={[whatsapp]} />)
    const tab = screen.getAllByRole('tab')[0]!
    fireEvent.keyDown(tab, { key: ' ' })
    expect(active(container)).toBe(0)
    fireEvent.keyDown(document.body, { key: 'ArrowDown', metaKey: true })
    expect(active(container)).toBe(0)
    fireEvent.keyDown(document.body, { key: 'ArrowDown' })
    expect(active(container)).toBe(1)
  })
})
