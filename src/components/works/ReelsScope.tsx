'use client'

import { useSearchParams } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react'

import { Action, type ActionLinkProps } from '@/components/ui/Action'
import { address, normalizeReel, withoutView } from '@/lib/reelView'
import type { ReelTile } from '@/lib/works'
import { ReelsViewer } from './ReelsViewer'

const ReelsContext = createContext<((key: string, from: HTMLElement) => void) | null>(null)

export function ReelLink({ href, onClick, ...props }: ActionLinkProps) {
  const open = useContext(ReelsContext)
  const key = new URL(href, 'http://local').searchParams.get('reel')
  return (
    <Action
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event)
        if (
          !open ||
          !key ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.altKey ||
          event.shiftKey
        )
          return
        event.preventDefault()
        open(key, event.currentTarget)
      }}
    />
  )
}

/** The URL owns the open state; the same data resolves it on the server and in history. */
export function ReelsScope({
  reels,
  path,
  initialSearch,
  children,
}: {
  reels: ReelTile[]
  path: string
  initialSearch: string
  children: ReactNode
}) {
  const params = useSearchParams()
  const search = new URLSearchParams(params?.toString() ?? initialSearch)
  const normalized = normalizeReel(search, reels)
  const index = reels.findIndex((reel) => reel.reel === normalized.key)
  const cleanHref = address(path, withoutView(search))
  const root = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  // A full reload intentionally loses ownership even if the history entry still has a marker.
  const token = useRef<string | null>(null)
  const previous = useRef<string | null>(normalized.key)

  useEffect(() => {
    if (normalized.changed)
      window.history.replaceState(
        { reelsOpen: window.history.state?.reelsOpen },
        '',
        address(path, normalized.search),
      )
  }, [normalized.changed, normalized.search, path])

  const returnFocus = useCallback((key: string) => {
    requestAnimationFrame(() => {
      const source = opener.current
      opener.current = null
      const links = [
        ...(root.current?.querySelectorAll<HTMLAnchorElement>('[data-works-grid] a[href]') ?? []),
      ]
      const tile = links.find((link) => new URL(link.href).searchParams.get('reel') === key)
      const fallback = root.current?.querySelector<HTMLElement>('[data-reels-fallback], h1')
      const target = source?.isConnected ? source : (tile ?? fallback)
      if (target && !target.matches('a, button, [tabindex]')) target.tabIndex = -1
      target?.focus({ preventScroll: true })
    })
  }, [])

  useEffect(() => {
    const old = previous.current
    previous.current = normalized.key
    if (old && !normalized.key) returnFocus(old)
  }, [normalized.key, returnFocus])

  const close = () => {
    if (token.current && window.history.state?.reelsOpen === token.current) window.history.back()
    else window.history.replaceState({}, '', cleanHref)
  }
  const open = (key: string, from: HTMLElement) => {
    if (!reels.some((reel) => reel.reel === key)) return
    opener.current = from
    const next = withoutView(new URLSearchParams(window.location.search))
    next.set('reel', key)
    token.current = crypto.randomUUID()
    window.history.pushState({ reelsOpen: token.current }, '', address(path, next))
  }
  const change = (nextIndex: number) => {
    const reel = reels[nextIndex]
    if (!reel) return
    const next = withoutView(new URLSearchParams(window.location.search))
    next.set('reel', reel.reel)
    window.history.replaceState(
      { reelsOpen: window.history.state?.reelsOpen },
      '',
      address(path, next),
    )
  }

  return (
    <ReelsContext.Provider value={open}>
      <div
        ref={root}
        inert={index >= 0}
        data-covered={index >= 0 ? '' : undefined}
        className="work-view-under"
      >
        {children}
      </div>
      {index >= 0 && (
        <ReelsViewer
          reels={reels}
          index={index}
          onIndex={change}
          onClose={close}
          closeHref={cleanHref}
        />
      )}
    </ReelsContext.Provider>
  )
}
