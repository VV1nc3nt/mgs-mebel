'use client'

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import { BgVideo } from '@/components/ui/BgVideo'
import { IconButton } from '@/components/ui/IconButton'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useHeroStep } from '@/hooks/useHeroStep'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/cn'
import { cssVars } from '@/lib/cssVars'
import { asMedia } from '@/lib/media'
import { isOverlayOpen, subscribeOverlay } from '@/lib/overlay'
import { wrapIndex } from '@/lib/slider'
import type { Media } from '@/payload-types'

export type HeroSegment = {
  label?: string
  title: string
  text?: string
  poster: Media | number
  video?: Media | number | null
}

type Props = {
  segments: HeroSegment[]
  /** Id of the H1 (segment 01). */
  titleId: string
  /** «Рассчитать проект» (server-rendered ContactButton); none — no button. */
  cta?: ReactNode
  /** «Подробнее о компании →»; none — no link. */
  link?: ReactNode
}

type View = {
  index: number
  /** 1 — forward, −1 — back: the outgoing text moves against it. */
  dir: 1 | -1
  /** Every switch restarts the progress (a new key) and the segment's video. */
  run: number
  /**
   * Run at which each segment was last switched to: the key of its mobile progress fill. The
   * outgoing fill keeps its key, so it freezes where it was and fades out with its text.
   */
  starts: number[]
  /** Switched by the visitor: announced politely; automatic switching is not announced. */
  manual: boolean
}

const number = (n: number) => String(n).padStart(2, '0')

/**
 * The hero scene (home README §1.2–1.6). The progress fill is a CSS animation: its `animationend`
 * switches to the next segment, and pausing it (keyboard focus, `data-paused`) pauses the
 * automatic switching — no timers, no state updates while it runs. Any switch, manual or automatic,
 * restarts the progress and the new segment's video; automatic switching goes on after manual
 * switches. One segment: a plain hero without controls.
 */
export function HomeHeroStage({ segments, titleId, cta, link }: Props) {
  const count = segments.length
  const multi = count > 1
  const [view, setView] = useState<View>(() => ({
    index: 0,
    dir: 1,
    run: 0,
    manual: false,
    starts: segments.map(() => 0),
  }))
  const reducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const { index } = view

  const go = (target: number, manual: boolean) =>
    setView((v) => {
      const next = wrapIndex(target, count)
      return {
        index: next,
        dir: target > v.index ? 1 : -1,
        run: v.run + 1,
        manual,
        starts: v.starts.map((start, i) => (i === next ? v.run + 1 : start)),
      }
    })

  useHeroStep({
    enabled: multi,
    slide: index,
    reducedMotion,
    step: (dir) => go(index + dir, true),
  })

  // Paused without a re-render: hidden tab, an overlay (menu) over the page, the hero off screen.
  useEffect(() => {
    const section = sectionRef.current
    if (!section || !multi) return
    let inView = true
    const update = () =>
      section.toggleAttribute('data-paused', !inView || document.hidden || isOverlayOpen())
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      update()
    })
    observer.observe(section)
    const unsubscribe = subscribeOverlay(update)
    document.addEventListener('visibilitychange', update)
    update()
    return () => {
      observer.disconnect()
      unsubscribe()
      document.removeEventListener('visibilitychange', update)
    }
  }, [multi])

  const next = () => go(index + 1, false)

  const onTabKey = (event: KeyboardEvent) => {
    const dir = ['ArrowRight', 'ArrowDown'].includes(event.key)
      ? 1
      : ['ArrowLeft', 'ArrowUp'].includes(event.key)
        ? -1
        : 0
    if (!dir) return
    event.preventDefault()
    tabRefs.current[wrapIndex(index + dir, count)]?.focus()
    go(index + dir, true)
  }

  return (
    <section
      ref={sectionRef}
      data-hero=""
      aria-roledescription={multi ? 'карусель' : undefined}
      aria-label={multi ? 'О компании' : undefined}
      aria-labelledby={multi ? undefined : titleId}
      style={cssVars({ '--hero-dir': view.dir })}
      className="relative h-svh min-h-hero overflow-hidden bg-surface md:h-hero-md xl:h-screen xl:min-h-hero-md"
    >
      {segments.map((segment, i) => {
        const inactive = i !== index
        return (
          <div
            key={i}
            aria-hidden={inactive || undefined}
            data-inactive={inactive ? '' : undefined}
            className="hero-layer absolute inset-0"
          >
            {asMedia(segment.poster) && (
              <BgVideo
                poster={segment.poster}
                video={segment.video}
                sizes={{ base: '100vw' }}
                priority={i === 0}
                fetchPriority={i === 0 ? undefined : 'low'}
                active={!inactive}
                lazySrc={i > 0}
                restartKey={view.run}
              />
            )}
          </div>
        )
      })}
      <div aria-hidden="true" className="absolute inset-0 bg-overlay-hero" />

      <div className="absolute inset-x-0 hero-content-bottom page-container">
        <div className="flex flex-col gap-4 md:max-w-hero">
          <div
            aria-live={multi ? (view.manual ? 'polite' : 'off') : undefined}
            // Clipped vertically only (the outgoing text moves up by 40px): a single word wider
            // than the 640 column stays whole
            className="grid overflow-y-clip"
          >
            {segments.map((segment, i) => {
              const inactive = i !== index
              const Heading = i === 0 ? 'h1' : 'h2'
              return (
                <div
                  key={i}
                  role={multi ? 'group' : undefined}
                  aria-roledescription={multi ? 'слайд' : undefined}
                  aria-label={multi ? `${i + 1} из ${count}` : undefined}
                  aria-hidden={inactive || undefined}
                  inert={inactive}
                  data-inactive={inactive ? '' : undefined}
                  className="hero-text flex flex-col justify-end gap-3 md:gap-4"
                >
                  {/* Mobile progress: in each block, so it always sits right above the label */}
                  {multi && (
                    <div
                      aria-hidden="true"
                      className="flex items-center gap-2.5 text-label font-bold md:hidden"
                    >
                      <span className={i === 0 ? 'text-accent' : 'text-text-3'}>{number(1)}</span>
                      <span className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-text/25">
                        <span
                          key={view.starts[i]}
                          onAnimationEnd={inactive ? undefined : next}
                          className="absolute inset-0 hero-progress hero-progress-x bg-accent"
                        />
                      </span>
                      <span className={i === count - 1 ? 'text-accent' : 'text-text-3'}>
                        {number(count)}
                      </span>
                    </div>
                  )}
                  {segment.label && <SectionLabel>{segment.label}</SectionLabel>}
                  <Heading
                    id={i === 0 ? titleId : undefined}
                    className="text-h1 text-balance md:text-h1-md xl:text-h1-xl"
                  >
                    {segment.title}
                  </Heading>
                  {segment.text && (
                    <p className="max-w-hero-text text-body text-pretty text-text-2">
                      {segment.text}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {(cta || multi || link) && (
            <div className="flex flex-wrap items-center gap-2 md:gap-x-6 md:gap-y-3 md:pt-1.5">
              {cta && <div className="flex min-w-0 flex-1 md:flex-none">{cta}</div>}
              {multi && (
                <>
                  <IconButton
                    variant="outline-media"
                    size={52}
                    aria-label="Предыдущий раздел"
                    onClick={() => go(index - 1, true)}
                    className={cn('md:hidden', !cta && 'ml-auto')}
                  >
                    <ArrowLeft />
                  </IconButton>
                  <IconButton
                    variant="light"
                    size={52}
                    aria-label="Следующий раздел"
                    onClick={() => go(index + 1, true)}
                    className="md:hidden"
                  >
                    <ArrowRight />
                  </IconButton>
                </>
              )}
              {link}
            </div>
          )}
        </div>
      </div>

      {multi && (
        <div className="pointer-events-none absolute inset-0 page-container hidden items-center justify-end md:flex">
          <div className="pointer-events-auto flex flex-col items-center gap-3">
            <IconButton
              variant="outline-media"
              size={44}
              aria-label="Предыдущий раздел"
              onClick={() => go(index - 1, true)}
              className="hover:border-accent"
            >
              <ArrowUp />
            </IconButton>
            <div
              role="tablist"
              aria-label="Разделы"
              aria-orientation="vertical"
              onKeyDown={onTabKey}
              className="flex flex-col items-center gap-3"
            >
              {segments.map((segment, i) => {
                const active = i === index
                return (
                  <button
                    key={i}
                    ref={(el) => {
                      tabRefs.current[i] = el
                    }}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    // Starts with the visible number (WCAG 2.5.3 label in name)
                    aria-label={`${number(i + 1)} ${segment.label ?? segment.title}`}
                    tabIndex={active ? 0 : -1}
                    onClick={() => go(i, true)}
                    className="flex min-w-11 flex-col items-center gap-2 py-1.5"
                  >
                    <span
                      className={cn(
                        'text-button-s transition-colors duration-200',
                        active ? 'text-accent' : 'text-text-3',
                      )}
                    >
                      {number(i + 1)}
                    </span>
                    <span
                      data-inactive={active ? undefined : ''}
                      className="relative block h-14 w-0.5 overflow-hidden rounded-full bg-text/25 hero-tab-bar"
                    >
                      {active && (
                        <span
                          key={view.run}
                          onAnimationEnd={next}
                          className="absolute inset-0 hero-progress hero-progress-y bg-accent"
                        />
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
            <IconButton
              variant="light"
              size={44}
              aria-label="Следующий раздел"
              onClick={() => go(index + 1, true)}
            >
              <ArrowDown />
            </IconButton>
          </div>
        </div>
      )}
    </section>
  )
}
