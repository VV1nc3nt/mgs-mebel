'use client'

import { Volume2, VolumeX } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState, type RefObject } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { VIDEO_START_TIMEOUT_MS } from '@/lib/bgVideo'
import { cn } from '@/lib/cn'
import type { VideoSource } from '@/lib/media'
import { claimSound } from '@/lib/soundPlayer'
import { playRefusal, progressShare, videoEvent, type VideoEvent } from '@/lib/viewer'

type Props = {
  source: VideoSource
  /** Sound off (the default); the viewer's choice, kept from frame to frame. */
  muted: boolean
  /** Plays only while the viewer is open (not closing). */
  active: boolean
  /** Fill of the current segment: the share of the file played, written each frame. */
  fillRef: RefObject<HTMLDivElement | null>
  /** The video has played to its end: the next frame. */
  onEnded: () => void
  /** The video cannot play: the poster stays, the segment is filled, no step by itself. */
  onFallback: () => void
  /** Sound is off again: refused by the autoplay policy, or another player took the sound. */
  onMuted: () => void
}

/**
 * Video of the current frame of the project viewer (README §6.4, §7): over the frame's poster,
 * started by `play()` (no autoplay attribute), muted by default, inline, no loop, no controls. It
 * is content, so it plays with reduced motion and on a slow connection too. Fades in on
 * `playing`; gives way to the poster when `play()` is refused muted, on `error`, on `stalled`
 * before the first `playing`, or without `playing` 4 s after an attempt. Pauses in a hidden tab
 * and while the viewer closes. Only one video with sound plays (lib/soundPlayer.ts). Mounted per
 * frame: a frame shown again starts from the beginning.
 */
export function ViewerVideo({ source, muted, active, fillRef, onEnded, onFallback, onMuted }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [shown, setShown] = useState(false)
  const started = useRef(false)
  const failed = useRef(false)
  const timeout = useRef<number | undefined>(undefined)
  const frame = useRef<number | undefined>(undefined)
  const callbacks = useRef({ onEnded, onFallback, onMuted })
  useEffect(() => {
    callbacks.current = { onEnded, onFallback, onMuted }
  })

  const clearStartTimeout = () => {
    window.clearTimeout(timeout.current)
    timeout.current = undefined
  }
  const writeFill = (share: number) =>
    fillRef.current?.style.setProperty('--viewer-progress', String(share))
  const stopFill = () => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    frame.current = undefined
  }
  // The file's own progress, each frame while it plays; standing still while it waits or pauses
  const runFill = () => {
    stopFill()
    const tick = () => {
      const video = videoRef.current
      if (video) writeFill(progressShare(video.currentTime, video.duration))
      frame.current = requestAnimationFrame(tick)
    }
    tick()
  }

  const fail = () => {
    if (failed.current) return
    failed.current = true
    clearStartTimeout()
    stopFill()
    videoRef.current?.pause()
    callbacks.current.onFallback()
  }

  const handle = (event: VideoEvent) => {
    switch (videoEvent(event, { started: started.current })) {
      case 'play':
        started.current = true
        clearStartTimeout()
        setShown(true)
        runFill()
        break
      case 'advance':
        stopFill()
        writeFill(1)
        callbacks.current.onEnded()
        break
      case 'fallback':
        fail()
        break
    }
  }

  // Called from the playback effect: the timer and the refusal of play()
  const onTimeout = useEffectEvent(() => handle('timeout'))
  const onRefused = useEffectEvent(fail)

  // Sound: the property follows the choice; with sound this player holds it (another one starting
  // with sound turns ours off). Before the playback effect: play() goes with the right setting.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = muted
    if (muted || !active) return
    return claimSound(() => callbacks.current.onMuted())
  }, [muted, active])

  // Playback: while the viewer is open and the tab is visible; paused otherwise
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const attempt = () => {
      if (failed.current) return
      if (!active || document.hidden) {
        clearStartTimeout()
        video.pause()
        return
      }
      if (!started.current && timeout.current === undefined) {
        timeout.current = window.setTimeout(onTimeout, VIDEO_START_TIMEOUT_MS)
      }
      video.play()?.catch((error: unknown) => {
        switch (playRefusal(error, video.muted)) {
          case 'retry-muted':
            // The autoplay policy: without sound, and the button shows it
            video.muted = true
            callbacks.current.onMuted()
            attempt()
            break
          case 'fallback':
            onRefused()
            break
        }
      })
    }
    attempt()
    document.addEventListener('visibilitychange', attempt)
    return () => {
      document.removeEventListener('visibilitychange', attempt)
      clearStartTimeout()
      video.pause()
    }
  }, [active])

  useEffect(() => stopFill, [])

  const setVideo = (video: HTMLVideoElement | null) => {
    videoRef.current = video
    if (!video) return
    // React sets the `muted` property but not the attribute; iOS inline playback needs both.
    video.defaultMuted = true
    video.muted = muted
    video.setAttribute('muted', '')
  }

  return (
    <video
      ref={setVideo}
      muted={muted}
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      onPlaying={() => handle('playing')}
      onPause={stopFill}
      onWaiting={stopFill}
      onEnded={() => handle('ended')}
      onError={() => handle('error')}
      onStalled={() => handle('stalled')}
      className={cn(
        'pointer-events-none absolute inset-0 size-full object-cover bg-video-fade motion-reduce:transition-none',
        shown ? 'opacity-100' : 'opacity-0',
      )}
    >
      <source src={source.src} type={source.type} onError={() => handle('error')} />
    </video>
  )
}

/**
 * Sound of the viewer's video (README §6.4): on the glass next to ×, the speaker crossed out while
 * muted. The label says what a press does (as in the design), so no aria-pressed on top of it.
 */
export function ViewerSoundButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <IconButton
      variant="glass"
      size={36}
      aria-label={muted ? 'Включить звук' : 'Выключить звук'}
      onClick={onToggle}
    >
      {muted ? <VolumeX /> : <Volume2 />}
    </IconButton>
  )
}
