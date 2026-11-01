'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useEffectEvent, useRef, useState, type PointerEvent } from 'react'

import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useLiteNetwork } from '@/hooks/useLiteNetwork'
import { useScrollLock } from '@/hooks/useScrollLock'
import { imageSource } from '@/lib/media'
import { setOverlay } from '@/lib/overlay'
import type { ReelTile } from '@/lib/works'
import { ReelVideo } from './ReelVideo'

const FOCUSABLE = 'a[href], button:not(:disabled), [tabindex="0"]'

export function ReelsViewer({
  reels,
  index,
  onIndex,
  onClose,
  closeHref,
}: {
  reels: ReelTile[]
  index: number
  onIndex: (index: number) => void
  onClose: () => void
  closeHref: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLAnchorElement>(null)
  const suppressClick = useRef(false)
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null)
  const [muted, setMuted] = useState(true)
  const reduced = useReducedMotion()
  const lite = useLiteNetwork()
  const { lock, unlock } = useScrollLock()
  const previous = reels[index - 1]
  const next = reels[index + 1]
  const close = useEffectEvent(onClose)
  const step = useEffectEvent((direction: number) => {
    if (reels[index + direction]) onIndex(index + direction)
  })
  const ended = () => {
    if (reduced) return
    if (next) onIndex(index + 1)
    else onClose()
  }

  useEffect(() => {
    lock()
    setOverlay('viewer', true)
    closeRef.current?.focus({ preventScroll: true })
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key === 'Tab') {
        const nodes = [...(root.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
        const first = nodes[0]
        const last = nodes.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
        return
      }
      if (
        event.target instanceof Element &&
        event.target.closest('[data-view-control], input, textarea, select, [contenteditable]')
      )
        return
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault()
        step(event.key === 'ArrowRight' ? 1 : -1)
      }
    }
    const focus = (event: FocusEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        closeRef.current?.focus({ preventScroll: true })
    }
    document.addEventListener('keydown', key)
    document.addEventListener('focusin', focus)
    return () => {
      document.removeEventListener('keydown', key)
      document.removeEventListener('focusin', focus)
      unlock({ toTop: false })
      setOverlay('viewer', false)
    }
  }, [lock, unlock])

  useEffect(() => {
    if (!root.current?.contains(document.activeElement))
      closeRef.current?.focus({ preventScroll: true })
  }, [index])

  const pointerDown = (event: PointerEvent) => {
    suppressClick.current = false
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      (event.target instanceof Element &&
        event.target.closest('[data-view-control], button:not([data-reel-toggle]), a'))
    )
      return
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
  }
  const pointerUp = (event: PointerEvent) => {
    const start = gesture.current
    gesture.current = null
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.hypot(dx, dy) > 8) suppressClick.current = true
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy))
      onIndex(Math.max(0, Math.min(reels.length - 1, index + (dx < 0 ? 1 : -1))))
    else if (dy > 120 && dy > Math.abs(dx)) onClose()
  }

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр REELS"
      className="fixed inset-0 z-viewer reels-view overflow-hidden bg-bg text-text"
    >
      <a
        ref={closeRef}
        href={closeHref}
        aria-label="Закрыть просмотр REELS"
        className="absolute top-4 right-4 z-20 flex size-11 items-center justify-center rounded-full glass"
        onClick={(event) => {
          if (
            event.button === 0 &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.shiftKey
          ) {
            event.preventDefault()
            onClose()
          }
        }}
      >
        <X aria-hidden="true" />
      </a>
      <div
        className="absolute inset-0 flex touch-none items-center justify-center overflow-hidden"
        onClickCapture={(event) => {
          // A compatibility click can target the newly active slide after the old one unmounts.
          if (suppressClick.current && event.detail !== 0) {
            event.preventDefault()
            event.stopPropagation()
            suppressClick.current = false
          }
        }}
        onPointerDown={pointerDown}
        onPointerUp={pointerUp}
        onPointerCancel={() => {
          gesture.current = null
        }}
      >
        {reels.map((entry, n) => {
          const image = imageSource(entry.image, 'hero')
          if (Math.abs(n - index) > 1) return null
          return (
            <div
              key={entry.reel}
              className="absolute isolate reels-slide overflow-hidden rounded-media bg-black"
              data-reel={entry.reel}
              aria-hidden={n !== index ? true : undefined}
              style={{ '--reel-offset': n - index } as React.CSSProperties}
            >
              {image && (
                <Image
                  src={image.src}
                  alt=""
                  fill
                  sizes="80vw"
                  priority={n === index}
                  className="object-contain"
                />
              )}
              {n === index ? (
                <ReelVideo source={entry.video} muted={muted} onMuted={setMuted} onEnded={ended} />
              ) : (
                <div className="absolute inset-0 cursor-pointer" onClick={() => onIndex(n)} />
              )}
            </div>
          )
        })}
      </div>
      {previous && (
        <button
          type="button"
          aria-label="Предыдущий ролик"
          onClick={() => onIndex(index - 1)}
          className="absolute top-1/2 left-4 z-10 flex size-13 -translate-y-1/2 items-center justify-center rounded-full glass"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
      )}
      {next && (
        <button
          type="button"
          aria-label="Следующий ролик"
          onClick={() => onIndex(index + 1)}
          className="absolute top-1/2 right-4 z-10 flex size-13 -translate-y-1/2 items-center justify-center rounded-full glass"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      )}
      <p
        aria-live="polite"
        className="absolute bottom-3 left-4 rounded-pill glass px-3 py-1.5 text-caption"
      >
        {index + 1} / {reels.length}
      </p>
      {!lite && next && (
        <video
          key={next.reel}
          data-reel-preload=""
          src={next.video.src}
          muted
          playsInline
          preload="metadata"
          hidden
          aria-hidden="true"
        />
      )}
    </div>
  )
}
