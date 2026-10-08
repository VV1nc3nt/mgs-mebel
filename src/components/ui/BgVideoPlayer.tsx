'use client'

import { useEffect, useRef, useState } from 'react'

import { useLiteNetwork } from '@/hooks/useLiteNetwork'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { VIDEO_START_TIMEOUT_MS, videoAllowed } from '@/lib/bgVideo'
import { cn } from '@/lib/cn'
import { VIDEO_MOUNT_MARGIN, type VideoSource } from '@/lib/media'
import { isOverlayOpen, subscribeOverlay } from '@/lib/overlay'
import { useBgVideoActive } from './BgVideoActive'

type Props = VideoSource & {
  /** Hero (LCP): mounts at once with preload="auto". Others mount near the viewport. */
  priority?: boolean
  /**
   * Plays only while active (and while its slide is, see `BgVideoActiveProvider`); inactive —
   * paused, the start timeout cancelled.
   */
  active?: boolean
  /** No source until the first time it is active (an inactive slide does not download). */
  lazySrc?: boolean
  /** A new value rewinds the video to the start. */
  restartKey?: string | number
}

/**
 * Background video over a server-rendered poster (README §1.3). Not mounted — so not downloaded —
 * with reduced motion, Data Saver or a slow connection, before hydration, or once playback fails:
 * the poster stays. Started by `play()` (no autoplay attribute); falls back to the poster when
 * `play()` is refused, on `error`, on `stalled` before the first `playing`, or without `playing`
 * 4 s after an attempt. Plays only when active, in the viewport, in a visible tab and not under
 * an overlay (menu); fades in on `playing`.
 */
export function BgVideoPlayer({
  src,
  type,
  priority = false,
  active: activeProp = true,
  lazySrc = false,
  restartKey,
}: Props) {
  const active = useBgVideoActive() && activeProp
  const reducedMotion = useReducedMotion()
  const liteNetwork = useLiteNetwork()
  const [near, setNear] = useState(priority)
  const [activated, setActivated] = useState(active)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playingRef = useRef(false)
  const timeoutRef = useRef<number | undefined>(undefined)
  const restartRef = useRef(restartKey)

  if (active && !activated) setActivated(true)

  const allowed = videoAllowed({ reducedMotion, liteNetwork }) && !failed
  const mounted = allowed && near && (!lazySrc || activated)

  const clearStartTimeout = () => {
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = undefined
  }

  // Before the playback effect: a slide that becomes active starts from the beginning.
  useEffect(() => {
    if (restartRef.current === restartKey) return
    restartRef.current = restartKey
    if (videoRef.current) videoRef.current.currentTime = 0
  }, [restartKey])

  useEffect(() => {
    const box = boxRef.current
    if (!box || !allowed) return
    let inView = false
    const update = () => {
      const video = videoRef.current
      if (!video) return
      if (active && inView && !document.hidden && !isOverlayOpen()) {
        if (!playingRef.current && timeoutRef.current === undefined) {
          timeoutRef.current = window.setTimeout(() => setFailed(true), VIDEO_START_TIMEOUT_MS)
        }
        // AbortError: interrupted by pause() — not a refusal, the next attempt follows.
        video.play()?.catch((error: unknown) => {
          if ((error as Error)?.name !== 'AbortError') setFailed(true)
        })
      } else {
        clearStartTimeout()
        video.pause()
      }
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting
        if (inView) setNear(true)
        update()
      },
      { rootMargin: VIDEO_MOUNT_MARGIN },
    )
    observer.observe(box)
    const unsubscribe = subscribeOverlay(update)
    document.addEventListener('visibilitychange', update)
    return () => {
      observer.disconnect()
      unsubscribe()
      document.removeEventListener('visibilitychange', update)
      clearStartTimeout()
    }
  }, [allowed, mounted, active])

  const setVideo = (video: HTMLVideoElement | null) => {
    videoRef.current = video
    if (!video) return
    // React sets the `muted` property but not the attribute; iOS inline playback needs both.
    video.defaultMuted = true
    video.muted = true
    video.setAttribute('muted', '')
  }

  const onPlaying = () => {
    playingRef.current = true
    clearStartTimeout()
    setPlaying(true)
  }

  const fail = () => setFailed(true)

  return (
    <div ref={boxRef} className="absolute inset-0">
      {mounted && (
        <video
          ref={setVideo}
          muted
          loop
          playsInline
          preload={priority ? 'auto' : 'metadata'}
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={onPlaying}
          onError={fail}
          onStalled={() => {
            if (!playingRef.current) fail()
          }}
          className={cn(
            'pointer-events-none absolute inset-0 size-full object-cover bg-video-fade',
            playing ? 'opacity-100' : 'opacity-0',
          )}
        >
          <source src={src} type={type} onError={fail} />
        </video>
      )}
    </div>
  )
}
