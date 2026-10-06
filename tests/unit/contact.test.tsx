import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ContactButton } from '@/components/ui/ContactButton'
import { closeChooser, getActiveChooser, openChooser } from '@/lib/chooser'
import { chooserGeometry, minChooserWidth } from '@/lib/chooserGeometry'

const MAX = { kind: 'max' as const, href: 'https://max.ru/u/x' }
const TG = { kind: 'telegram' as const, href: 'https://t.me/mgsmebel_official' }
const WA = { kind: 'whatsapp' as const, href: 'https://wa.me/79270963555' }
const CAPTION = 'Рассчитать проект'

describe('chooserGeometry', () => {
  // README of the buttons §4: (n+1)·44 + n·4 + 10 — 198 for three, 150 for two (the README's
  // «152» does not follow its own formula)
  it('the narrowest open capsule: 198 for three messengers, 150 for two', () => {
    expect(minChooserWidth(3)).toBe(198)
    expect(minChooserWidth(2)).toBe(150)
  })

  it('closed: the button itself', () => {
    expect(chooserGeometry({ width: 170, height: 44, n: 3, open: false })).toEqual({
      width: 170,
      height: 44,
      button: 170,
    })
  })

  it('open: 54 high for buttons of 44, 48 and 52, cells and «×» of 44', () => {
    for (const height of [44, 48, 52]) {
      expect(chooserGeometry({ width: 170, height, n: 3, open: true })).toEqual({
        width: 198,
        height: 54,
        button: 44,
      })
    }
  })

  it('open: a wider button keeps its width', () => {
    expect(chooserGeometry({ width: 350, height: 52, n: 2, open: true }).width).toBe(350)
  })
})

describe('ContactButton', () => {
  afterEach(() => act(() => closeChooser()))

  it('renders nothing without messengers or a caption', () => {
    const { container, rerender } = render(<ContactButton caption={CAPTION} messengers={[]} />)
    expect(container.innerHTML).toBe('')
    rerender(<ContactButton caption=" " messengers={[MAX, TG]} />)
    expect(container.innerHTML).toBe('')
  })

  it('one messenger: a plain link in a new tab, without aria-expanded', () => {
    render(<ContactButton caption={CAPTION} messengers={[TG]} arrow />)
    const link = screen.getByRole('link', { name: 'Рассчитать проект в Telegram' })
    expect(link.getAttribute('href')).toBe(TG.href)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link.hasAttribute('aria-expanded')).toBe(false)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('two or three: the button of the choice, cells in order, folded and inert', () => {
    render(<ContactButton caption={CAPTION} messengers={[MAX, TG, WA]} />)
    const button = screen.getByRole('button', { name: 'Рассчитать проект — выбрать мессенджер' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.textContent).toBe(CAPTION)
    const group = screen.getByRole('group', { name: 'Выбрать мессенджер', hidden: true })
    expect(group.hasAttribute('inert')).toBe(true)
    const links = [...group.querySelectorAll('a')]
    expect(links.map((a) => a.getAttribute('aria-label'))).toEqual(['MAX', 'Telegram', 'WhatsApp'])
    expect(links.map((a) => a.getAttribute('target'))).toEqual(['_blank', '_blank', '_blank'])
    // Stagger from «×»: WhatsApp first
    expect(links.map((a) => a.style.getPropertyValue('--i'))).toEqual(['2', '1', '0'])

    fireEvent.click(button, { detail: 1 })
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(button.getAttribute('aria-label')).toBe('Закрыть выбор мессенджера')
    expect(group.hasAttribute('inert')).toBe(false)
    fireEvent.click(button, { detail: 1 })
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('two messengers: two cells', () => {
    render(<ContactButton caption={CAPTION} messengers={[MAX, WA]} />)
    const group = screen.getByRole('group', { hidden: true })
    expect(group.querySelectorAll('a')).toHaveLength(2)
  })

  it('the open capsule takes its measured size; closed it is the button', () => {
    const { container } = render(<ContactButton caption={CAPTION} messengers={[MAX, TG, WA]} />)
    const capsule = container.querySelector<HTMLElement>('.chooser-capsule')!
    // jsdom measures 0: closed — 0 wide, open — the narrowest capsule
    expect(capsule.style.getPropertyValue('--capsule-w')).toBe('0')
    fireEvent.click(screen.getByRole('button'), { detail: 1 })
    expect(capsule.style.getPropertyValue('--capsule-w')).toBe('198')
    expect(capsule.style.getPropertyValue('--capsule-h')).toBe('54')
    expect(capsule.style.getPropertyValue('--button-w')).toBe('44')
  })

  it('opening a button closes the dock or another button, and the other way round', () => {
    render(
      <>
        <ContactButton caption="Первая" messengers={[MAX, TG]} />
        <ContactButton caption="Вторая" messengers={[MAX, TG]} />
      </>,
    )
    const first = screen.getByRole('button', { name: 'Первая — выбрать мессенджер' })
    const second = screen.getByRole('button', { name: 'Вторая — выбрать мессенджер' })
    fireEvent.click(first, { detail: 1 })
    fireEvent.click(second, { detail: 1 })
    expect(first.getAttribute('aria-expanded')).toBe('false')
    expect(second.getAttribute('aria-expanded')).toBe('true')
    act(() => openChooser('dock'))
    expect(second.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(first, { detail: 1 })
    expect(getActiveChooser()).not.toBe('dock')
  })

  it('outline tone: a dark ring while closed (lime on lime is not seen)', () => {
    render(<ContactButton caption={CAPTION} messengers={[MAX, TG]} tone="outline" size={48} />)
    const button = screen.getByRole('button')
    expect(button.className).toContain('outline-on-accent')
    expect(button.className).toContain('group-data-open/chooser:outline-accent')
  })

  it('from the keyboard: focus on MAX, Esc returns to the button', async () => {
    render(<ContactButton caption={CAPTION} messengers={[MAX, TG, WA]} />)
    const button = screen.getByRole('button')
    fireEvent.click(button, { detail: 0 })
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))
    const [max, tg] = screen.getAllByRole('link')
    expect(document.activeElement).toBe(max)
    fireEvent.keyDown(max!, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(tg)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button)
  })
})
