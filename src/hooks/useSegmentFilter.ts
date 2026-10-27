'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

import { filterUrl, parseFilter } from '@/lib/segmentFilter'

type Options<T extends string> = {
  /** URL parameter, e.g. `category`. */
  param: string
  /** Values of the chips. */
  values: readonly T[]
  /** «все»: no parameter in the URL; unknown values fall back to it too. */
  fallback: T
}

/**
 * The value of a feed filter (catalogs, news, works) in the URL (`?param=`), read with
 * useSearchParams, so the server renders the filtered list. A change replaces the history entry
 * (no new one); the scroll position stays.
 */
export function useSegmentFilter<T extends string>({ param, values, fallback }: Options<T>) {
  const value = parseFilter(useSearchParams().get(param), values, fallback)

  const select = useCallback(
    (next: T) => {
      if (next === value) return
      window.history.replaceState(null, '', filterUrl(window.location.href, param, next, fallback))
    },
    [value, param, fallback],
  )

  return { value, select }
}
