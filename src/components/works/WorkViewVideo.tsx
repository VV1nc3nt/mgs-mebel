'use client'

import { Volume2, VolumeX } from 'lucide-react'
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'

import { HIT_AREA_Y } from '@/components/ui/hitArea'
import { VIDEO_START_TIMEOUT_MS } from '@/lib/bgVideo'
import { cn } from '@/lib/cn'
import { DESKTOP_QUERY } from '@/lib/breakpoints'
import type { VideoSource } from '@/lib/media'
import { claimSound } from '@/lib/soundPlayer'
import { formatTime, playRefusal, progressShare, SEEK_STEP } from '@/lib/workView'

type Props = {
  /** Which layout of the view holds it: the other one is hidden by CSS and never loads it. */
  layout: 'strip' | 'list'
  source: VideoSource
  /** The frame in view: plays; otherwise paused where it was. Mounted on the first time. */
  active: boolean
  /** Sound off (the default); the choice of the view, kept from frame to frame. */
  muted: boolean
  onMuted: (muted: boolean) => void
}

const subscribeDesktop = (onChange: () => void) => {
  const query = window.matchMedia(DESKTOP_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** Marks the controls of a video: their keys are their own, not the view's. */
export const VIDEO_CONTROL_ATTR = 'data-view-control'

/**
 * Video of a frame of the view of an item (works v2 §3.4, the reference's own controls): over
 * the frame's poster, muted and looped, started by `play()`; plays only while its frame is the
 * current one, in a visible tab. A tap pauses and plays; «Звук выкл / Звук вкл» — only one video
 * with sound (lib/soundPlayer); the bar shows the played share and seeks on a tap or a drag.
 * Gives way to the poster when it cannot play (refused muted, `error`, `stalled` or no `playing`
 * before the start timeout).
 */
export function WorkViewVideo({ layout, source, active, muted, onMuted }: Props) {
  const [mounted, setMounted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [shown, setShown] = useState(false)
  const [failed, setFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const seeking = useRef(false)

  // Mounted the first time its frame is current, in the layout shown; not on the server and
  // during hydration (the layout is not known there)
  const inLayout = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches === (layout === 'strip'),
    () => false,
  )
  if (active && inLayout && !mounted) setMounted(true)
  const playing = active && !paused && !failed

  const failNow = () => {
    videoRef.current?.pause()
    setFailed(true)
  }
  const fail = useEffectEvent(failNow)
  const mutedByPolicy = useEffectEvent(() => onMuted(true))

  const writeProgress = (video: HTMLVideoElement) => {
    const share = progressShare(video.currentTime, video.duration)
    fillRef.current?.style.setProperty('--p', String(share))
    const bar = barRef.current
    if (bar) {
      bar.setAttribute('aria-valuenow', String(Math.round(share * 100)))
      bar.setAttribute(
        'aria-valuetext',
        `${formatTime(video.currentTime)} из ${formatTime(video.duration)}`,
      )
    }
  }

  // Playback: while the frame is current, not paused by a tap, the tab visible
  useEffect(() => {
    const video = videoRef.current
    if (!video || failed) return
    let timeout: number | undefined
    const attempt = () => {
      window.clearTimeout(timeout)
      if (!playing || document.hidden) {
        video.pause()
        return
      }
      if (!started.current) timeout = window.setTimeout(fail, VIDEO_START_TIMEOUT_MS)
      video.play()?.catch((error: unknown) => {
        switch (playRefusal(error, video.muted)) {
          case 'retry-muted':
            // The autoplay policy: without sound, and the button shows it
            video.muted = true
            mutedByPolicy()
            attempt()
            break
          case 'fallback':
            fail()
            break
        }
      })
    }
    attempt()
    document.addEventListener('visibilitychange', attempt)
    return () => {
      window.clearTimeout(timeout)
      document.removeEventListener('visibilitychange', attempt)
      video.pause()
    }
  }, [playing, failed, mounted])

  // Sound: the property follows the choice; with sound this video holds it while it plays
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = muted
    if (muted || !playing) return
    return claimSound(() => onMuted(true))
  }, [muted, playing, mounted, onMuted])

  // The played share, each frame while it plays (no re-render)
  useEffect(() => {
    if (!playing) return
    let frame = 0
    const tick = () => {
      const video = videoRef.current
      if (video) writeProgress(video)
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [playing, mounted])

  const seekTo = (time: number) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return
    video.currentTime = Math.min(Math.max(time, 0), video.duration)
    writeProgress(video)
  }
  const seekAt = (clientX: number) => {
    const bar = barRef.current
    const video = videoRef.current
    if (!bar || !video) return
    const { left, width } = bar.getBoundingClientRect()
    seekTo(progressShare(clientX - left, width) * video.duration)
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    seeking.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    seekAt(event.clientX)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (seeking.current) seekAt(event.clientX)
  }
  const onPointerUp = () => {
    seeking.current = false
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video) return
    const time =
      event.key === 'ArrowLeft' || event.key === 'ArrowDown'
        ? video.currentTime - SEEK_STEP
        : event.key === 'ArrowRight' || event.key === 'ArrowUp'
          ? video.currentTime + SEEK_STEP
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? video.duration
              : null
    if (time === null) return
    event.preventDefault()
    seekTo(time)
  }

  const setVideo = (video: HTMLVideoElement | null) => {
    videoRef.current = video
    if (!video) return
    // React sets the `muted` property but not the attribute; iOS inline playback needs both.
    video.defaultMuted = true
    video.muted = muted
    video.setAttribute('muted', '')
  }

  if (!mounted || failed) return null

  return (
    <>
      <video
        ref={setVideo}
        muted={muted}
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        onPlaying={() => {
          started.current = true
          setShown(true)
        }}
        onError={failNow}
        onStalled={() => {
          if (!started.current) failNow()
        }}
        className={cn(
          'pointer-events-none absolute inset-0 size-full object-cover bg-video-fade motion-reduce:transition-none',
          shown ? 'opacity-100' : 'opacity-0',
        )}
      >
        <source src={source.src} type={source.type} onError={failNow} />
      </video>
      <button
        type="button"
        aria-label={paused ? 'Воспроизвести' : 'Пауза'}
        {...{ [VIDEO_CONTROL_ATTR]: '' }}
        onClick={() => setPaused((p) => !p)}
        className="absolute inset-0 cursor-pointer focus-visible:-outline-offset-2"
      />
      <button
        type="button"
        aria-pressed={!muted}
        {...{ [VIDEO_CONTROL_ATTR]: '' }}
        onClick={() => onMuted(!muted)}
        className={cn(
          'absolute right-3 bottom-10 inline-flex h-9 items-center gap-1.5 rounded-pill glass px-3.5 text-caption',
          HIT_AREA_Y,
        )}
      >
        {muted ? (
          <VolumeX aria-hidden="true" className="size-4" />
        ) : (
          <Volume2 aria-hidden="true" className="size-4" />
        )}
        {muted ? 'Звук выкл' : 'Звук вкл'}
      </button>
      <div
        ref={barRef}
        role="slider"
        tabIndex={0}
        aria-label="Перемотка"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        {...{ [VIDEO_CONTROL_ATTR]: '' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="absolute inset-x-3 bottom-1.5 flex h-6.5 cursor-pointer touch-none items-center"
      >
        <div className="h-1 w-full overflow-hidden rounded-full bg-text/30">
          <div ref={fillRef} className="h-full work-view-progress bg-text" />
        </div>
      </div>
    </>
  )
}
