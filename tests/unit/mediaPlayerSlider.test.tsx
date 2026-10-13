import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BgVideo } from '@/components/ui/BgVideo'
import { MediaSlider } from '@/components/ui/MediaSlider'
import { PosterPlayer } from '@/components/ui/PosterPlayer'
import { claimSound } from '@/lib/soundPlayer'
import { intersect } from './setup'
import { photo, video } from './fixtures'

const FILE = { src: '/api/media/file/promo.mp4', type: 'video/mp4' }
const RUTUBE = 'https://rutube.ru/video/1480655fcab995b927db77bdd9d83986/'
const poster = <img alt="Постер" src="/poster.jpg" />

describe('PosterPlayer', () => {
  it('a file: ▶ named with the caption; a click plays it with controls, ended gives ▶ back', async () => {
    const { container } = render(
      <PosterPlayer poster={poster} file={FILE} caption="Презентация" duration="02:17" />,
    )
    expect(screen.getByText('Презентация')).toBeTruthy()
    expect(screen.getByText('02:17')).toBeTruthy()
    // Nothing is loaded before the click
    expect(container.querySelector('video')).toBeNull()
    const play = screen.getByRole('button', { name: 'Смотреть видео: Презентация' })

    await act(async () => fireEvent.click(play))
    const element = container.querySelector('video')!
    expect(element.hasAttribute('controls')).toBe(true)
    expect(element.muted).toBe(false)
    expect(element.querySelector('source')?.getAttribute('src')).toBe(FILE.src)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
    expect(document.activeElement).toBe(element)
    expect(container.firstElementChild!.hasAttribute('data-playing')).toBe(true)
    // The poster stays under the player: the block keeps its content
    expect(screen.getByAltText('Постер')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()

    await act(async () => fireEvent.ended(element))
    expect(container.querySelector('video')).toBeNull()
    expect(container.firstElementChild!.hasAttribute('data-playing')).toBe(false)
    const again = screen.getByRole('button', { name: 'Смотреть видео: Презентация' })
    expect(document.activeElement).toBe(again)
  })

  it('a refused play() gives the poster back', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementationOnce(() =>
      Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' })),
    )
    const { container } = render(<PosterPlayer poster={poster} file={FILE} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Смотреть видео' })))
    expect(container.querySelector('video')).toBeNull()
    expect(screen.getByRole('button', { name: 'Смотреть видео' })).toBeTruthy()
  })

  it('a RuTube link: the platform player in place, with autoplay and the minimal permissions', async () => {
    const { container } = render(
      <PosterPlayer poster={poster} embedUrl={RUTUBE} caption="Презентация" />,
    )
    expect(container.querySelector('iframe')).toBeNull()
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Смотреть видео: Презентация' })),
    )
    const frame = container.querySelector('iframe')!
    expect(frame.getAttribute('src')).toBe(
      'https://rutube.ru/play/embed/1480655fcab995b927db77bdd9d83986/?autoplay=true',
    )
    expect(frame.getAttribute('title')).toBe('Презентация')
    expect(frame.getAttribute('allow')).toBe(
      'autoplay; encrypted-media; fullscreen; picture-in-picture',
    )
    expect(frame.getAttribute('sandbox')).toBe(
      'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox',
    )
    expect(frame.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin')
    expect(container.firstElementChild!.hasAttribute('data-playing')).toBe(true)
  })

  it('no file and no known link: the poster without ▶, the plates stay', () => {
    const { rerender } = render(<PosterPlayer poster={poster} caption="Подпись" />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Подпись')).toBeTruthy()
    rerender(<PosterPlayer poster={poster} embedUrl="https://rutube.ru/channel/1/" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('one sound at a time: a second player stops the first', async () => {
    const { container } = render(
      <>
        <PosterPlayer poster={poster} file={FILE} caption="Первое" />
        <PosterPlayer poster={poster} embedUrl={RUTUBE} caption="Второе" />
      </>,
    )
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Смотреть видео: Первое' })),
    )
    expect(container.querySelector('video')).not.toBeNull()
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Смотреть видео: Второе' })),
    )
    expect(container.querySelector('video')).toBeNull()
    expect(container.querySelector('iframe')).not.toBeNull()
  })

  it('claimSound: the release of a stopped player does not drop the new one', () => {
    const first = vi.fn()
    const second = vi.fn()
    const releaseFirst = claimSound(first)
    const releaseSecond = claimSound(second)
    expect(first).toHaveBeenCalledOnce()
    releaseFirst()
    claimSound(vi.fn())
    expect(second).toHaveBeenCalledOnce()
    releaseSecond()
  })
})

const card = (title: string, withVideo = false) => (
  <>
    <BgVideo poster={photo} video={withVideo ? video : null} sizes={{ base: '86vw' }} lazySrc />
    <h3>{title}</h3>
  </>
)

const slider = (slides: ReturnType<typeof card>[], extra = {}) => (
  <MediaSlider
    size="exhibition"
    headingId="t"
    heading={<h2 id="t">Выставки</h2>}
    slides={slides}
    prevLabel="Предыдущая выставка"
    nextLabel="Следующая выставка"
    {...extra}
  />
)

describe('MediaSlider', () => {
  it('no slides: nothing', () => {
    expect(render(slider([], { arrows: true })).container.innerHTML).toBe('')
  })

  it('one slide: no arrows, counter or progress', () => {
    const { container } = render(
      slider([card('Выставка 2026')], { arrows: true, counter: true, progress: true }),
    )
    expect(screen.getByRole('region', { name: 'Выставки' })).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByText('01')).toBeNull()
    expect(container.querySelectorAll('[aria-hidden="true"] > span')).toHaveLength(0)
  })

  it('N slides: arrows stop at the ends and stay focusable, counter and progress follow', async () => {
    const { container } = render(
      slider([card('Первая'), card('Вторая'), card('Третья')], {
        arrows: true,
        counter: true,
        progress: true,
      }),
    )
    const prev = screen.getByRole('button', { name: 'Предыдущая выставка' })
    const next = screen.getByRole('button', { name: 'Следующая выставка' })
    const slides = screen.getAllByRole('group')
    expect(slides.map((s) => s.getAttribute('aria-label'))).toEqual(['1 из 3', '2 из 3', '3 из 3'])
    const activeSlide = () => slides.findIndex((s) => s.hasAttribute('data-active'))
    const bars = () =>
      [...container.querySelectorAll('[aria-hidden="true"] > span')].map((b) =>
        b.classList.contains('bg-accent'),
      )
    expect(activeSlide()).toBe(0)
    expect(prev.getAttribute('aria-disabled')).toBe('true')
    expect(next.hasAttribute('aria-disabled')).toBe(false)
    expect(screen.getByText('01').parentElement?.textContent).toBe('01 / 03')
    expect(bars()).toEqual([true, false, false])

    // At the start ← does nothing
    await act(async () => fireEvent.click(prev))
    expect(activeSlide()).toBe(0)

    await act(async () => fireEvent.click(next))
    await act(async () => fireEvent.click(next))
    expect(activeSlide()).toBe(2)
    expect(screen.getByText('03').parentElement?.textContent).toBe('03 / 03')
    expect(bars()).toEqual([false, false, true])
    expect(next.getAttribute('aria-disabled')).toBe('true')
    expect(prev.hasAttribute('aria-disabled')).toBe(false)
    // The disabled-looking arrow is still a button in the Tab order
    expect(next.hasAttribute('disabled')).toBe(false)
    await act(async () => fireEvent.click(next))
    expect(activeSlide()).toBe(2)
  })

  it('only the active card has a video source; the one left keeps its video, paused', async () => {
    const { container } = render(
      slider([card('Первая', true), card('Вторая', true)], { arrows: true }),
    )
    const slides = screen.getAllByRole('group')
    await act(async () => intersect(true))
    // A mounted video reports its own intersection (a new observer)
    await act(async () => intersect(true))
    expect(slides[0].querySelector('video')).not.toBeNull()
    expect(slides[1].querySelector('video')).toBeNull()

    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Следующая выставка' })),
    )
    await act(async () => intersect(true))
    const first = slides[0].querySelector('video')
    expect(first).not.toBeNull()
    expect(slides[1].querySelector('video')).not.toBeNull()
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()

    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Предыдущая выставка' })),
    )
    // The same element: it resumes where it was, not from the start
    expect(slides[0].querySelector('video')).toBe(first)
    expect(container.querySelectorAll('video')).toHaveLength(2)
  })
})
