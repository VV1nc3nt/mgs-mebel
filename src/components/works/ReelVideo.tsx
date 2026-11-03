'use client'

import { Volume2, VolumeX } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'

import { VIDEO_START_TIMEOUT_MS } from '@/lib/bgVideo'
import { claimSound } from '@/lib/soundPlayer'
import { formatTime, SEEK_STEP } from '@/lib/workView'
import type { VideoSource } from '@/lib/media'

/** Mounted only for the active reel. Cleanup always pauses and resets the old element. */
export function ReelVideo({
  source,
  poster,
  muted,
  onMuted,
  onEnded,
}: {
  source: VideoSource
  poster?: string
  muted: boolean
  onMuted: (value: boolean) => void
  onEnded: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [paused, setPaused] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const toggle = useRef<HTMLButtonElement>(null)
  const progress = useRef<HTMLDivElement>(null)
  const seeking = useRef(false)
  const pointer = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const release = useRef<(() => void) | null>(null)
  const stopSound = () => {
    release.current?.()
    release.current = null
  }
  const start = useEffectEvent(async () => {
    const video = ref.current
    if (!video || paused || failed || document.hidden) return
    try {
      // Claim before play, so there is no interval with two audible players.
      if (!video.muted)
        release.current ??= claimSound(() => {
          video.pause()
          setPaused(true)
        })
      await video.play()
      setBlocked(false)
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return
      stopSound()
      video.dispatchEvent(new Event('reelblocked'))
      setBlocked(true)
    }
  })

  useEffect(() => {
    const video = ref.current
    if (!video) return
    video.defaultMuted = true
    video.muted = muted
    video.setAttribute('muted', '')
    if (muted) stopSound()
    else if (!video.paused && !paused && !document.hidden)
      release.current ??= claimSound(() => {
        video.pause()
        setPaused(true)
      })
  }, [muted, paused])

  useEffect(() => {
    const video = ref.current
    if (!video) return
    let cancelled = false
    let timeout: ReturnType<typeof setTimeout> | undefined
    let resume = false
    const clear = () => clearTimeout(timeout)
    const play = () => {
      if (paused || failed || document.hidden) return
      clear()
      timeout = setTimeout(() => {
        if (!cancelled) {
          video.pause()
          stopSound()
          setFailed(true)
        }
      }, VIDEO_START_TIMEOUT_MS)
      void start()
    }
    const playing = () => {
      clear()
      setBlocked(false)
    }
    const refusal = () => clear()
    const visibility = () => {
      if (document.hidden) {
        resume = !video.paused && !paused
        video.pause()
        stopSound()
        clear()
      } else if (resume) {
        resume = false
        play()
      }
    }
    video.addEventListener('playing', playing)
    video.addEventListener('reelblocked', refusal)
    document.addEventListener('visibilitychange', visibility)
    if (paused || failed) {
      video.pause()
      stopSound()
    } else play()
    return () => {
      cancelled = true
      clear()
      video.removeEventListener('playing', playing)
      video.removeEventListener('reelblocked', refusal)
      document.removeEventListener('visibilitychange', visibility)
      video.pause()
      stopSound()
    }
  }, [paused, failed, attempt])

  const setVideo = useCallback((video: HTMLVideoElement | null) => {
    const old = ref.current
    if (old && old !== video) {
      old.pause()
      old.currentTime = 0
    }
    if (video) {
      video.defaultMuted = true
      video.setAttribute('muted', '')
    }
    ref.current = video
  }, [])

  const fail = () => {
    ref.current?.pause()
    stopSound()
    setFailed(true)
  }
  const seek = (next: number) => {
    const video = ref.current
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return
    video.currentTime = Math.max(0, Math.min(next, video.duration))
    setTime(video.currentTime)
    setDuration(video.duration)
  }
  const seekAt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = progress.current?.getBoundingClientRect()
    if (rect) seek(((event.clientX - rect.left) / rect.width) * (ref.current?.duration ?? 0))
  }
  const seekKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const now = ref.current?.currentTime ?? 0
    const next =
      event.key === 'ArrowLeft' || event.key === 'ArrowDown'
        ? now - SEEK_STEP
        : event.key === 'ArrowRight' || event.key === 'ArrowUp'
          ? now + SEEK_STEP
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? ref.current?.duration
              : undefined
    if (next === undefined) return
    event.preventDefault()
    event.stopPropagation()
    seek(next)
  }
  const launch = () => {
    toggle.current?.focus({ preventScroll: true })
    setPaused(false)
    setBlocked(false)
    setAttempt((n) => n + 1)
  }
  return (
    <>
      {!failed && (
        <video
          ref={setVideo}
          poster={poster}
          src={source.src}
          playsInline
          muted={muted}
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none absolute inset-0 size-full bg-black object-contain"
          onError={fail}
          onTimeUpdate={(event) => {
            setTime(event.currentTarget.currentTime)
            setDuration(event.currentTarget.duration)
          }}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onEnded={() => {
            stopSound()
            setPaused(true)
            onEnded()
          }}
        />
      )}
      <button
        type="button"
        aria-label={paused || blocked ? 'Воспроизвести' : 'Пауза'}
        ref={toggle}
        data-reel-toggle=""
        className="absolute inset-0 touch-none rounded-media focus-visible:-outline-offset-2"
        onPointerDown={(event) => {
          pointer.current = { x: event.clientX, y: event.clientY, moved: false }
        }}
        onPointerMove={(event) => {
          const p = pointer.current
          if (p && Math.hypot(event.clientX - p.x, event.clientY - p.y) > 8) p.moved = true
        }}
        onPointerCancel={() => {
          if (pointer.current) pointer.current.moved = true
        }}
        onClick={(event) => {
          if (event.detail !== 0 && pointer.current?.moved) {
            pointer.current = null
            return
          }
          pointer.current = null
          if (blocked || paused) launch()
          else setPaused(true)
        }}
      />
      {(failed || blocked) && (
        <div
          role="status"
          className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-4 rounded-media bg-bg/90 p-5 text-center"
        >
          <p>
            {failed
              ? 'Не удалось загрузить видео.'
              : 'Не удалось запустить видео автоматически. Нажмите „Воспроизвести“.'}
          </p>
          <button
            type="button"
            className="min-h-11 rounded-pill bg-accent px-5 font-semibold text-on-accent"
            onClick={() => {
              if (failed) {
                setFailed(false)
                setAttempt((n) => n + 1)
              }
              launch()
            }}
          >
            {failed ? 'Повторить загрузку' : 'Воспроизвести'}
          </button>
        </div>
      )}
      <button
        type="button"
        aria-pressed={!muted}
        aria-label={muted ? 'Звук выкл' : 'Звук вкл'}
        onClick={() => onMuted(!muted)}
        className="reels-sound absolute right-3 bottom-12 inline-flex min-h-11 items-center gap-2 rounded-pill glass px-3 text-caption"
      >
        {muted ? (
          <VolumeX aria-hidden="true" className="size-4" />
        ) : (
          <Volume2 aria-hidden="true" className="size-4" />
        )}
        <span>{muted ? 'Звук выкл' : 'Звук вкл'}</span>
      </button>
      <div
        ref={progress}
        role="slider"
        tabIndex={0}
        aria-label="Перемотка"
        aria-valuemin={0}
        aria-valuemax={Number.isFinite(duration) && duration > 0 ? duration : 0}
        aria-valuenow={time}
        aria-valuetext={`${formatTime(time)} / ${formatTime(duration)}`}
        data-view-control=""
        className="reels-seek absolute inset-x-3 bottom-0 flex h-11 cursor-pointer touch-none items-center"
        onKeyDown={seekKey}
        onPointerDown={(event) => {
          event.stopPropagation()
          seeking.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          seekAt(event)
        }}
        onPointerMove={(event) => {
          if (seeking.current) {
            event.stopPropagation()
            seekAt(event)
          }
        }}
        onPointerUp={(event) => {
          event.stopPropagation()
          seeking.current = false
        }}
        onPointerCancel={() => {
          seeking.current = false
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-0.75 w-full overflow-hidden rounded-full bg-text/30">
          <div
            className="h-full origin-left bg-text"
            style={{
              width: `${Number.isFinite(duration) && duration > 0 ? Math.min(100, (time / duration) * 100) : 0}%`,
            }}
          />
        </div>
      </div>
    </>
  )
}
