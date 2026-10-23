'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { preload } from 'react-dom'
import { getImageProps } from 'next/image'

import { useLiteNetwork } from '@/hooks/useLiteNetwork'
import { imageSizes, imageSource } from '@/lib/media'
import { createItemLoader, fetchWorkItem, type ItemLoader } from '@/lib/workItemLoader'
import {
  ITEM_PARAM,
  parsePhoto,
  PHOTO_PARAM,
  readItemView,
  type ViewerFrame,
  type ViewerItem,
} from '@/lib/workView'

/** An item rendered on the server with the page (`?item=`): null — not visible. */
export type InitialView = { id: number; item: ViewerItem | null }

/** Marks a history entry pushed by the view; Next keeps it next to its own state. */
type HistoryState = { workView?: boolean } | null

const pushedByView = () => (window.history.state as HistoryState)?.workView === true

/** The address of now with params changed (null — removed). */
const withParams = (params: Record<string, string | null>): string => {
  const url = new URL(window.location.href)
  for (const [name, value] of Object.entries(params)) {
    if (value === null) url.searchParams.delete(name)
    else url.searchParams.set(name, value)
  }
  return `${url.pathname}${url.search}${url.hash}`
}

// The same `sizes` as the frames of the view (WorkViewer): the preloaded file is the one shown
const VIEW_SIZES = imageSizes({ base: '100vw', xl: '60vw' })

/** The first photo of an item, ahead of its view (after a prefetch). */
function preloadFrame(frame: ViewerFrame | undefined) {
  const image = frame && imageSource(frame.image, 'hero')
  if (!image) return
  const { props } = getImageProps({
    src: image.src,
    alt: '',
    width: image.width,
    height: image.height,
    sizes: VIEW_SIZES,
  })
  preload(props.src, {
    as: 'image',
    imageSrcSet: props.srcSet,
    imageSizes: props.sizes,
    fetchPriority: 'low',
  })
}

export type WorkViewOptions = {
  /**
   * Every item the address may open, known up front (the page of a project): no request, and an
   * id that is not here closes the view. Without it — the items load by id (/works).
   */
  items?: Readonly<Record<number, ViewerItem>>
}

export type WorkView = {
  /** The item of `?item=` once its data is here; null — closed. */
  item: ViewerItem | null
  /** Frame of `?photo=` (0-based). */
  photo: number
  /** Open from a tile: its data (at once if prefetched), then a new history entry. */
  open: (id: number, href: string) => void
  intent: (id: number) => void
  cancelIntent: () => void
  /** × / Esc: back to the entry it was opened from, else the feed in place of the view. */
  close: () => void
  /** The current frame: `?photo=` replaced. */
  setPhoto: (index: number) => void
  /** The current frame of another item (a project's view crosses items): `?item=&photo=`. */
  setFrame: (id: number, index: number) => void
}

/**
 * Open state of the view of an item on /works and its address (`?item=&photo=`). The URL is the
 * source: pushState / replaceState of the History API are synced into useSearchParams by Next
 * without a request, so «Назад» closes the view and the feed stays as it is. A new object is
 * passed to every pushState / replaceState: Next skips the sync for a state that already carries
 * its own fields.
 */
export function useWorkView(
  initial: InitialView | null,
  { items: fixed }: WorkViewOptions = {},
): WorkView {
  const search = useSearchParams()
  const { item: itemId, photo: rawPhoto } = readItemView(search)
  const lite = useLiteNetwork()
  const liteRef = useRef(lite)
  useEffect(() => {
    liteRef.current = lite
  }, [lite])

  // Data of the items by id (null — not visible); the server's one is here from the start
  const [items, setItems] = useState<Map<number, ViewerItem | null>>(
    () => new Map(initial ? [[initial.id, initial.item]] : []),
  )
  const store = useCallback((id: number, item: ViewerItem | null) => {
    setItems((all) => (all.get(id) === item ? all : new Map(all).set(id, item)))
  }, [])

  // Lives as long as the page
  const [loader] = useState<ItemLoader>(() => {
    const created = createItemLoader((id) =>
      fetchWorkItem(id).then((item) => {
        preloadFrame(item?.frames[0])
        return item
      }),
    )
    if (initial) created.seed(initial.id, initial.item)
    return created
  })

  const known = itemId !== null && (fixed !== undefined || items.has(itemId))
  const item =
    itemId === null ? null : fixed ? (fixed[itemId] ?? null) : (items.get(itemId) ?? null)

  // An address with an item not here yet (back / forward to it, an address typed in): load it
  useEffect(() => {
    if (itemId === null || known) return
    let live = true
    loader
      .load(itemId)
      .then((data) => live && store(itemId, data))
      .catch(() => live && store(itemId, null))
    return () => {
      live = false
    }
  }, [itemId, known, loader, store])

  // Not visible (hidden, removed, made up): the feed, without the view and without an error
  useEffect(() => {
    if (itemId !== null && known && !item) {
      window.history.replaceState({}, '', withParams({ [ITEM_PARAM]: null, [PHOTO_PARAM]: null }))
    }
  }, [itemId, known, item])

  // The feed of the address is the item's type (/works; a project page has no feed)
  const category = search.get('category')
  const feed = fixed === undefined
  useEffect(() => {
    if (feed && item && category !== item.type) {
      window.history.replaceState(
        { workView: pushedByView() },
        '',
        withParams({ category: item.type }),
      )
    }
  }, [feed, item, category])

  const fixedRef = useRef(fixed)
  useEffect(() => {
    fixedRef.current = fixed
  }, [fixed])

  const request = useRef(0)
  const open = useCallback(
    (id: number, href: string) => {
      const ticket = ++request.current
      if (fixedRef.current) {
        // The data is on the page: a new history entry at once
        if (!fixedRef.current[id]) return window.location.assign(href)
        window.history.pushState({ workView: true }, '', href)
        return
      }
      loader
        .load(id)
        .then((data) => {
          if (ticket !== request.current) return
          store(id, data)
          // Hidden meanwhile: the link itself (the server renders the feed without a view)
          if (!data) return window.location.assign(href)
          window.history.pushState({ workView: true }, '', href)
        })
        .catch(() => {
          if (ticket === request.current) window.location.assign(href)
        })
    },
    [loader, store],
  )

  const close = useCallback(() => {
    request.current++
    if (pushedByView()) window.history.back()
    else
      window.history.replaceState({}, '', withParams({ [ITEM_PARAM]: null, [PHOTO_PARAM]: null }))
  }, [])

  const setPhoto = useCallback((index: number) => {
    window.history.replaceState(
      { workView: pushedByView() },
      '',
      withParams({ [PHOTO_PARAM]: index > 0 ? String(index + 1) : null }),
    )
  }, [])

  const setFrame = useCallback((id: number, index: number) => {
    window.history.replaceState(
      { workView: pushedByView() },
      '',
      withParams({ [ITEM_PARAM]: String(id), [PHOTO_PARAM]: index > 0 ? String(index + 1) : null }),
    )
  }, [])

  // Data Saver or a slow connection: nothing ahead, the data comes on a click
  const intent = useCallback(
    (id: number) => {
      if (!liteRef.current) loader.intent(id)
    },
    [loader],
  )

  return {
    item,
    photo: item ? parsePhoto(rawPhoto, item.frames.length) : 0,
    open,
    intent,
    cancelIntent: loader.cancelIntent,
    close,
    setPhoto,
    setFrame,
  }
}
