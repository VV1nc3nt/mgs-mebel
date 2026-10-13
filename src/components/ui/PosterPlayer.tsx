'use client'

import { Play } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { toEmbed, withAutoplay } from '@/lib/embed'
import type { VideoSource } from '@/lib/media'
import { claimSound } from '@/lib/soundPlayer'

type Props = {
  /** The poster, rendered on the server (PosterImage): fills the block. */
  poster: ReactNode
  /** A video file with sound; wins over a link. */
  file?: VideoSource | null
  /** Link to a RuTube or VK Video page; unknown formats are no link. */
  embedUrl?: string | null
  /** Glass plate at the bottom left; also names the button and the platform player. */
  caption?: string | null
  /** At the bottom right, e.g. «02:17». */
  duration?: string | null
  /** Size and corners of the block: aspect ratio per breakpoint, radius. */
  className?: string
  playLabel?: string
}

type Mode = 'poster' | 'file' | 'embed'

/**
 * A video played on a click, with sound (about v2 §2.5; the news video block): the poster with ▶
 * and the caption first. A file starts in place with the native controls and gives the poster back
 * when it ends; a RuTube / VK link opens the platform's player in the block. Without a file or a
 * known link — the poster without ▶. The block keeps its size throughout: nothing around moves.
 * Only one player has sound at a time (lib/soundPlayer.ts). While playing the block carries
 * data-playing (a heading over it fades: media-heading-fade).
 */
export function PosterPlayer({
  poster,
  file,
  embedUrl,
  caption,
  duration,
  className,
  playLabel = 'Смотреть видео',
}: Props) {
  const [mode, setMode] = useState<Mode>('poster')
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const wasPlaying = useRef(false)
  const embed = file ? null : toEmbed(embedUrl)
  const playable = !!file || !!embed
  const label = caption ? `${playLabel}: ${caption}` : playLabel

  useEffect(() => {
    if (mode === 'poster') {
      // Back to the poster: the focus was on the player, which is gone — give it to ▶
      if (wasPlaying.current) {
        wasPlaying.current = false
        const active = document.activeElement
        if (!active || active === document.body || root.current?.contains(active)) {
          button.current?.focus()
        }
      }
      return
    }
    wasPlaying.current = true
    if (mode === 'file') {
      const element = video.current
      element?.focus()
      // AbortError: interrupted by pause() — not a refusal
      element?.play()?.catch((error: unknown) => {
        if ((error as Error)?.name !== 'AbortError') setMode('poster')
      })
    } else {
      frame.current?.focus()
    }
    // Another player starting stops this one
    return claimSound(() => setMode('poster'))
  }, [mode])

  return (
    <div
      ref={root}
      data-playing={mode === 'poster' ? undefined : ''}
      className={cn('relative overflow-hidden bg-surface', className)}
    >
      {poster}
      {mode === 'file' && file && (
        <video
          ref={video}
          controls
          playsInline
          // Focusable in every browser: the focus moves here from ▶
          tabIndex={0}
          preload="none"
          onEnded={() => setMode('poster')}
          className="absolute inset-0 size-full object-cover"
        >
          <source src={file.src} type={file.type} />
        </video>
      )}
      {mode === 'embed' && embed && (
        <iframe
          ref={frame}
          src={withAutoplay(embed)}
          title={caption || playLabel}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          // The player's own links to the platform open in a new tab; no top navigation, no forms
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0 bg-black"
        />
      )}
      {mode === 'poster' && (
        <>
          <div aria-hidden="true" className="absolute inset-0 bg-overlay-promo" />
          {playable && (
            <button
              ref={button}
              type="button"
              aria-label={label}
              onClick={() => setMode(file ? 'file' : 'embed')}
              className="absolute top-1/2 left-1/2 flex size-play -translate-1/2 cursor-pointer items-center justify-center rounded-full bg-accent pl-1.5 text-on-accent transition-transform duration-200 hover:scale-106 motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              <Play aria-hidden="true" className="size-6.5 fill-current" />
            </button>
          )}
          {(caption || duration) && (
            <div className="absolute inset-x-5 bottom-5 flex items-center justify-between gap-3">
              {caption && (
                <p className="rounded-2xl glass px-3.5 py-2 text-body-xs font-semibold">
                  {caption}
                </p>
              )}
              {duration && (
                <p className="ml-auto text-body-xs font-semibold text-text-2">{duration}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
