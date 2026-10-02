'use client'

import { useEffect, useRef, useState } from 'react'

import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useSaveData } from '@/hooks/useSaveData'
import { cn } from '@/lib/cn'
import { VIDEO_MOUNT_MARGIN, type VideoSource } from '@/lib/media'
import { isOverlayOpen, subscribeOverlay } from '@/lib/overlay'

type Props = VideoSource & {
  /** Hero (LCP): mounts at once with preload="auto". Others mount near the viewport. */
  priority?: boolean
}

/**
 * Background video over a server-rendered poster (README §7). Not mounted — so not downloaded —
 * with reduced motion, Data Saver, before hydration, or when playback fails (iOS Low Power):
 * the poster stays. Plays only in the viewport and not under an overlay (menu); appears on
 * `playing`.
 */
export function BgVideoPlayer({ src, type, priority = false }: Props) {
  const reducedMotion = useReducedMotion()
  const saveData = useSaveData()
  const [near, setNear] = useState(priority)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const allowed = !reducedMotion && !saveData && !failed

  useEffect(() => {
    const box = boxRef.current
    if (!box || !allowed) return
    let inView = false
    const update = () => {
      const video = videoRef.current
      if (!video) return
      if (inView && !isOverlayOpen()) video.play()?.catch(() => setFailed(true))
      else video.pause()
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
    return () => {
      observer.disconnect()
      unsubscribe()
    }
  }, [allowed, near])

  const setVideo = (video: HTMLVideoElement | null) => {
    videoRef.current = video
    if (!video) return
    // React sets the `muted` property but not the attribute; iOS autoplay needs both.
    video.defaultMuted = true
    video.muted = true
    video.setAttribute('muted', '')
  }

  return (
    <div ref={boxRef} className="absolute inset-0">
      {allowed && near && (
        <video
          ref={setVideo}
          autoPlay
          muted
          loop
          playsInline
          preload={priority ? 'auto' : 'metadata'}
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
          onError={() => setFailed(true)}
          className={cn(
            'pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-200',
            playing ? 'opacity-100' : 'opacity-0',
          )}
        >
          <source src={src} type={type} onError={() => setFailed(true)} />
        </video>
      )}
    </div>
  )
}
