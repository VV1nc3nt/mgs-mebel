import type { ViewerItem } from './workView'

/** Hover or touch of a tile this long is an intent to open it: its data is fetched ahead. */
export const PREFETCH_INTENT_MS = 150

export type FetchItem = (id: number) => Promise<ViewerItem | null>

export type ItemLoader = {
  /** The request of an item: the one in flight or done, else a new one (a click). */
  load: (id: number) => Promise<ViewerItem | null>
  /** Pointer over / finger on a tile: after PREFETCH_INTENT_MS its data is fetched. */
  intent: (id: number) => void
  /** The pointer left before the intent: nothing is fetched. */
  cancelIntent: () => void
  /** An item known already (rendered on the server). */
  seed: (id: number, item: ViewerItem | null) => void
}

/**
 * Data of the items of the view, by id, in memory for the page. Prefetches never pile up: at most
 * one in flight, an intent meanwhile is dropped, an item asked for already is not asked again.
 * A click takes the request of the same item if there is one, else starts its own at once.
 * A failed request is forgotten (tried again next time). `fetchItem` must not be queued behind
 * other requests (a GET, not a Server Action — those are dispatched one at a time).
 */
export function createItemLoader(
  fetchItem: FetchItem,
  { lite = () => false }: { lite?: () => boolean } = {},
): ItemLoader {
  const requests = new Map<number, Promise<ViewerItem | null>>()
  let prefetching = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const request = (id: number) => {
    const promise = fetchItem(id)
    requests.set(id, promise)
    promise.catch(() => {
      if (requests.get(id) === promise) requests.delete(id)
    })
    return promise
  }

  const cancelIntent = () => {
    clearTimeout(timer)
    timer = undefined
  }

  return {
    load: (id) => requests.get(id) ?? request(id),
    intent: (id) => {
      cancelIntent()
      if (lite() || requests.has(id)) return
      timer = setTimeout(() => {
        timer = undefined
        if (prefetching || requests.has(id)) return
        prefetching = true
        request(id)
          .catch(() => null)
          .finally(() => {
            prefetching = false
          })
      }, PREFETCH_INTENT_MS)
    },
    cancelIntent,
    seed: (id, item) => {
      requests.set(id, Promise.resolve(item))
    },
  }
}

/** The item of the view from `/work-items/<id>`: null — not visible (404). */
export async function fetchWorkItem(id: number): Promise<ViewerItem | null> {
  const response = await fetch(`/work-items/${id}`, { headers: { Accept: 'application/json' } })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`work item ${id}: ${response.status}`)
  return (await response.json()) as ViewerItem
}
