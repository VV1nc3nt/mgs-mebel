'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Image from 'next/image'
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type TouchEvent,
} from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useScrollLock } from '@/hooks/useScrollLock'
import { getActiveChooser } from '@/lib/chooser'
import type { Messenger } from '@/lib/chrome'
import { cn } from '@/lib/cn'
import { focalPosition, imageSizes, imageSource } from '@/lib/media'
import { setOverlay } from '@/lib/overlay'
import { wrapIndex } from '@/lib/slider'
import { initialStepState, wheelGesture } from '@/lib/wheelGesture'
import {
  frameCounter,
  rotate,
  slideOffset,
  stripPlaces,
  type ViewerFrame,
  type ViewerItem,
} from '@/lib/workView'
import { WorkViewPanel } from './WorkViewPanel'
import { VIDEO_CONTROL_ATTR, WorkViewVideo } from './WorkViewVideo'

type Props = {
  /** Frames of the view in their order; each belongs to an item (its panel). */
  frames: ViewerFrame[]
  /** Items of the frames by id. */
  owners: Record<number, ViewerItem>
  /** Frame to start at (`?photo=`). */
  start: number
  /** The current frame changed (a step, the frame in focus): the address follows. */
  onIndex: (index: number) => void
  /** × / Esc / swipe down. */
  onClose: () => void
  /** Where × leads without script: the feed. */
  closeHref: string
  /** Unmounted: the focus goes back (to the tile). */
  onClosed: () => void
  priceDate: string | null
  messengers: Messenger[]
}

// The same sizes for every frame of both layouts: the browser picks one file for a photo, the
// layout hidden by CSS takes it from the cache
const VIEW_SIZES = imageSizes({ base: '100vw', xl: '60vw' })

/** A swipe down this far (px), started at the top of the first frame, closes the view. */
const CLOSE_SWIPE = 120

// Focus in these: their keys are their own
const OWN_KEYS = `input, textarea, select, [contenteditable]:not([contenteditable="false"]), [${VIDEO_CONTROL_ATTR}]`

/** Plain left click: a modified one (new tab, window) stays a link. */
const plainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

type FrameImageProps = {
  frame: ViewerFrame
  /** Loaded at once (the current frame and its neighbours), else when near the screen. */
  eager?: boolean
  /** The LCP image: the current frame. */
  priority?: boolean
  /** A copy beside the current frame: no alt (the strip around the current one is decoration). */
  hidden?: boolean
}

function FrameImage({ frame, eager, priority, hidden }: FrameImageProps) {
  const image = imageSource(frame.image, 'hero')
  if (!image) return null
  return (
    <Image
      src={image.src}
      alt={hidden ? '' : image.alt}
      fill
      sizes={VIEW_SIZES}
      loading={eager || priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      className="object-cover"
      style={{ objectPosition: focalPosition(frame.image) }}
    />
  )
}

/**
 * View of an item of «Наши работы» (works v2 §3.4, the behaviour of the portfolio reference): a
 * full-screen dialog over the works page with the frames (photos, then videos) and the panel of
 * the current frame's item. From 1280 — a strip that goes round: the current frame in the centre,
 * the neighbours dimmed at the sides (a click steps), arrows, ← / →, one frame per wheel gesture.
 * Below — the frames one under another from the current one round, then the panel; the frame at
 * 40 % of the screen is the current one. Built for several items (PR c: a whole project); the
 * page under it is inert and frozen, its background videos pause.
 */
export function WorkViewer({
  frames,
  owners,
  start,
  onIndex,
  onClose,
  closeHref,
  onClosed,
  priceDate,
  messengers,
}: Props) {
  const count = frames.length
  const multi = count > 1
  const xl = useBreakpoint() === 'xl'
  const reducedMotion = useReducedMotion()
  const { lock, unlock } = useScrollLock()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLAnchorElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // ≥ 1280: the place in an endless row (the frame is `place` mod count) — no seam going round
  const [place, setPlace] = useState(start)
  // < 1280: the frames from the start one round (the first one is right without script); the one
  // at the focus line, and whether the panel has reached it
  const [order] = useState(() =>
    rotate(
      frames.map((_, i) => i),
      start,
    ),
  )
  const [focused, setFocused] = useState(start)
  const [onPanel, setOnPanel] = useState(false)
  const [muted, setMuted] = useState(true)

  const current = xl ? wrapIndex(place, count) : focused
  const frame = frames[current] ?? frames[0]
  const owner = frame ? owners[frame.owner] : undefined

  const report = useEffectEvent(onIndex)
  const lastReported = useRef(start)
  useEffect(() => {
    if (current === lastReported.current) return
    lastReported.current = current
    report(current)
  }, [current])

  // Open: the page frozen and inert, its videos paused, the focus on ×; closed — all back
  const closed = useEffectEvent(onClosed)
  useLayoutEffect(() => {
    lock()
    setOverlay('viewer', true)
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      unlock({ toTop: false })
      setOverlay('viewer', false)
      closed()
    }
  }, [lock, unlock])

  const step = useCallback(
    (dir: 1 | -1) => {
      if (multi) setPlace((p) => p + dir)
    },
    [multi],
  )

  // Crossing 1280 keeps the frame: the strip stands on it, the list scrolls to it
  const [layoutXl, setLayoutXl] = useState(xl)
  if (layoutXl !== xl) {
    setLayoutXl(xl)
    if (xl) setPlace(focused)
    else setFocused(wrapIndex(place, count))
  }
  const listed = useRef(xl)
  useEffect(() => {
    if (listed.current === xl) return
    listed.current = xl
    if (!xl) dialogRef.current?.querySelector(`[data-frame="${focused}"]`)?.scrollIntoView()
    // Only the crossing itself: the frame in focus then
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xl])

  const close = useEffectEvent(onClose)
  const keyStep = useEffectEvent((dir: 1 | -1) => {
    if (xl) step(dir)
  })

  // Keys: Esc closes; ← / → step on the strip. A messenger choice (the CTA) keeps its own keys
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (getActiveChooser() !== null) return
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.target instanceof Element && event.target.closest(OWN_KEYS)) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      keyStep(event.key === 'ArrowRight' ? 1 : -1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Wheel and trackpad over the strip: one frame per gesture (the hero's lib/wheelGesture)
  useEffect(() => {
    const strip = stripRef.current
    if (!strip || !xl) return
    let state = initialStepState()
    const onWheel = (event: WheelEvent) => {
      const dy = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      const result = wheelGesture(state, {
        dy,
        now: Date.now(),
        rm: reducedMotion,
        active: true,
        wants: multi,
      })
      state = result.state
      if (result.consume) event.preventDefault()
      if (result.step) step(result.step)
    }
    strip.addEventListener('wheel', onWheel, { passive: false })
    return () => strip.removeEventListener('wheel', onWheel)
  }, [xl, multi, reducedMotion, step])

  // < 1280: the frame at the focus line (40 % of the screen) is the current one; the panel there —
  // no frame plays. A band of 1 %: an empty one is not reliably crossed.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || xl) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const target = entry.target as HTMLElement
          if (target === panelRef.current) setOnPanel(true)
          else {
            setOnPanel(false)
            setFocused(Number(target.dataset.frame))
          }
        }
      },
      { root: dialog, rootMargin: '-40% 0% -59% 0%' },
    )
    dialog.querySelectorAll('[data-frame]').forEach((el) => observer.observe(el))
    if (panelRef.current) observer.observe(panelRef.current)
    return () => observer.disconnect()
  }, [xl])

  // < 1280: a swipe down from the top of the list closes (the list cannot scroll further up)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (event: TouchEvent) => {
    const t = event.touches[0]
    swipe.current =
      !xl && t && event.touches.length === 1 && (dialogRef.current?.scrollTop ?? 0) <= 0
        ? { x: t.clientX, y: t.clientY }
        : null
  }
  const onTouchEnd = (event: TouchEvent) => {
    const t = event.changedTouches[0]
    const from = swipe.current
    swipe.current = null
    if (!t || !from || getActiveChooser() !== null) return
    const dy = t.clientY - from.y
    if (dy > CLOSE_SWIPE && dy > Math.abs(t.clientX - from.x)) onClose()
  }

  const onCloseClick = (event: MouseEvent) => {
    if (!plainClick(event)) return
    event.preventDefault()
    onClose()
  }

  const counter = multi ? frameCounter(frames, current) : null

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={owner?.title || undefined}
      data-work-view=""
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="fixed inset-0 z-viewer work-view overflow-y-auto overscroll-contain bg-bg-viewer xl:overflow-hidden"
    >
      <div className="fixed top-4 right-4 z-media-text">
        <IconButton
          ref={closeRef}
          href={closeHref}
          prefetch={false}
          onClick={onCloseClick}
          variant="surface"
          size={44}
          aria-label="Закрыть"
        >
          <X />
        </IconButton>
      </div>
      {counter && (
        <p
          data-view-counter=""
          className="fixed top-4 left-4 z-media-text flex h-8 items-center rounded-pill glass px-3.5 text-body-xs font-semibold xl:hidden"
        >
          {counter}
        </p>
      )}

      {/* ≥ 1280: the strip */}
      <div className="relative hidden h-dvh overflow-hidden p-6 xl:block">
        <div ref={stripRef} data-view-strip="" className="work-view-strip relative size-full">
          {stripPlaces(count).map((d) => {
            const at = place + d
            const f = frames[wrapIndex(at, count)]
            if (!f) return null
            const isCurrent = d === 0
            const style = {
              '--r': f.ratio,
              '--x': slideOffset((s) => frames[wrapIndex(place + s, count)]?.ratio ?? 1, d),
            } as CSSProperties
            const media = (
              <>
                <FrameImage
                  frame={f}
                  eager={Math.abs(d) <= 1}
                  priority={isCurrent}
                  hidden={!isCurrent}
                />
                {isCurrent && f.video && (
                  <WorkViewVideo
                    layout="strip"
                    source={f.video}
                    active={xl}
                    muted={muted}
                    onMuted={setMuted}
                  />
                )}
              </>
            )
            return isCurrent ? (
              <div
                key={at}
                data-slide="current"
                className="work-view-slide overflow-hidden rounded-media bg-surface-2"
                style={style}
              >
                {media}
              </div>
            ) : (
              <button
                key={at}
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                data-slide={d}
                onClick={() => step(d > 0 ? 1 : -1)}
                className="work-view-slide cursor-pointer overflow-hidden rounded-media bg-surface-2 opacity-35"
                style={style}
              >
                {media}
              </button>
            )
          })}
        </div>
        {multi && (
          <>
            <div className="absolute top-1/2 left-10 -translate-y-1/2">
              <IconButton
                variant="glass"
                size={52}
                aria-label="Предыдущее фото"
                onClick={() => step(-1)}
              >
                <ChevronLeft />
              </IconButton>
            </div>
            <div className="absolute top-1/2 right-10 -translate-y-1/2">
              <IconButton
                variant="glass"
                size={52}
                aria-label="Следующее фото"
                onClick={() => step(1)}
              >
                <ChevronRight />
              </IconButton>
            </div>
            <p
              data-view-counter=""
              className="absolute bottom-10 left-10 flex h-8 items-center rounded-pill glass px-3.5 text-body-xs font-semibold"
            >
              {counter}
            </p>
          </>
        )}
      </div>

      {/* < 1280: the frames one under another */}
      <div data-view-list="" className="flex flex-col gap-1.5 p-1.5 xl:hidden">
        {order.map((i, n) => {
          const f = frames[i]
          if (!f) return null
          return (
            <div
              key={f.key}
              data-frame={i}
              className="relative work-view-frame w-full overflow-hidden rounded-thumb bg-surface-2"
              style={{ '--r': f.ratio } as CSSProperties}
            >
              <FrameImage frame={f} eager={n < 2} priority={n === 0} />
              {f.video && (
                <WorkViewVideo
                  layout="list"
                  source={f.video}
                  active={!xl && !onPanel && focused === i}
                  muted={muted}
                  onMuted={setMuted}
                />
              )}
            </div>
          )
        })}
      </div>

      <div
        ref={panelRef}
        className={cn('xl:h-dvh xl:overflow-y-auto xl:overscroll-contain')}
        data-view-panel=""
      >
        {owner && <WorkViewPanel item={owner} priceDate={priceDate} messengers={messengers} />}
      </div>
    </div>
  )
}
