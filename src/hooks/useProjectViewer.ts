'use client'

import { usePathname } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { projectHref, slugFromPath, WORKS_PATH } from '@/lib/viewer'

/**
 * Phase of the viewer: `enter` — mounted and appearing, `open` — fully shown (rendered open on the
 * server, or its appearing has ended), `leave` — closing.
 */
export type ViewerPhase = 'enter' | 'open' | 'leave'

export type ViewerState = {
  /** Current project; null — closed. */
  slug: string | null
  phase: ViewerPhase
  /**
   * Opened from the feed by pushState: closing goes back in history. Otherwise (a direct visit
   * to /works/<slug>) closing replaces the URL with /works.
   */
  fromFeed: boolean
}

export type ProjectViewerApi = ViewerState & {
  /** Open from a card of the feed: a new history entry /works/<slug>, no navigation. */
  open: (slug: string) => void
  /** Another project in the open viewer: the URL is replaced. */
  go: (slug: string) => void
  /** × / Esc / swipe down on the first project / end of the feed. */
  close: () => void
  /** The appearing has ended: fully shown, the page under it may hide. */
  opened: () => void
  /** The closing fade has ended: unmount. */
  settle: () => void
}

/** Marks a history entry pushed by the viewer; Next keeps it next to its own state. */
type HistoryState = { viewer?: boolean } | null

const pushedByViewer = () => (window.history.state as HistoryState)?.viewer === true

/**
 * Open state of the project viewer and its URL. Next's router is not involved: pushState /
 * replaceState are synced into usePathname by Next without a request, and back / forward
 * restore the same page from its cache — the feed and its scroll stay as they are.
 * A new object is passed to every pushState / replaceState: Next skips the sync for a state that
 * already carries its own fields.
 */
export function useViewerState(initialSlug: string | null): ProjectViewerApi {
  const pathname = usePathname()
  // The server's project only while the URL is still its own: the same page may come back from
  // the router's cache on /works after the viewer was closed
  const [state, setState] = useState<ViewerState>(() => ({
    slug: initialSlug && slugFromPath(pathname) === initialSlug ? initialSlug : null,
    phase: 'open',
    fromFeed: false,
  }))
  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])

  const update = useCallback((next: ViewerState) => {
    stateRef.current = next
    setState(next)
  }, [])

  const open = useCallback(
    (slug: string) => {
      window.history.pushState({ viewer: true }, '', projectHref(slug))
      update({ slug, phase: 'enter', fromFeed: true })
    },
    [update],
  )

  const go = useCallback(
    (slug: string) => {
      const s = stateRef.current
      window.history.replaceState({ viewer: s.fromFeed }, '', projectHref(slug))
      update({ ...s, slug })
    },
    [update],
  )

  const close = useCallback(() => {
    const s = stateRef.current
    if (!s.slug || s.phase === 'leave') return
    update({ ...s, phase: 'leave' })
    // Back to the entry the viewer was opened from: popstate finds it closing already
    if (s.fromFeed && pushedByViewer()) window.history.back()
    else window.history.replaceState({}, '', WORKS_PATH)
  }, [update])

  const opened = useCallback(() => {
    const s = stateRef.current
    if (s.slug && s.phase === 'enter') update({ ...s, phase: 'open' })
  }, [update])

  const settle = useCallback(() => {
    const s = stateRef.current
    if (s.phase === 'leave') update({ slug: null, phase: 'open', fromFeed: false })
  }, [update])

  useEffect(() => {
    const s = stateRef.current
    const slug = slugFromPath(window.location.pathname)
    // A reload keeps the history entry of the feed: closing goes back to it
    if (s.slug && pushedByViewer()) update({ ...s, fromFeed: true })
    // Restored on /works/<slug> without the server's project (back after another page): open it
    else if (!s.slug && slug) update({ slug, phase: 'enter', fromFeed: pushedByViewer() })

    // Back / forward between the list and a project
    const onPopState = () => {
      const target = slugFromPath(window.location.pathname)
      const current = stateRef.current
      const shown = current.slug !== null && current.phase !== 'leave'
      if (target) {
        if (shown && current.slug === target) return
        update({ slug: target, phase: shown ? 'open' : 'enter', fromFeed: pushedByViewer() })
      } else if (shown) {
        update({ ...current, phase: 'leave' })
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [update])

  return { ...state, open, go, close, opened, settle }
}

export const ProjectViewerContext = createContext<ProjectViewerApi | null>(null)

/** The viewer around the feed: open it from a card, know whether it covers the page. */
export function useProjectViewer(): ProjectViewerApi {
  const viewer = useContext(ProjectViewerContext)
  if (!viewer) throw new Error('useProjectViewer must be used inside WorksView')
  return viewer
}
