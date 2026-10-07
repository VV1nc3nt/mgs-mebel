import { useSyncExternalStore } from 'react'

import { isLiteNetwork, type NetworkInfo } from '@/lib/bgVideo'

type Connection = EventTarget & NetworkInfo

const connection = (): Connection | undefined =>
  (navigator as Navigator & { connection?: Connection }).connection

const subscribe = (onChange: () => void) => {
  const conn = connection()
  conn?.addEventListener('change', onChange)
  return () => conn?.removeEventListener('change', onChange)
}

/**
 * Data Saver or a slow connection (`navigator.connection`, `isLiteNetwork`). `true` on the server
 * and during hydration (no video before hydration).
 */
export function useLiteNetwork(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      const conn = connection()
      return conn ? isLiteNetwork(conn) : false
    },
    () => true,
  )
}
