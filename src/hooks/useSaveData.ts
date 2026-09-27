import { useSyncExternalStore } from 'react'

type Connection = EventTarget & { saveData?: boolean }

const connection = (): Connection | undefined =>
  (navigator as Navigator & { connection?: Connection }).connection

const subscribe = (onChange: () => void) => {
  const conn = connection()
  conn?.addEventListener('change', onChange)
  return () => conn?.removeEventListener('change', onChange)
}

/** Data Saver (`navigator.connection.saveData`). `true` on the server and during hydration. */
export function useSaveData(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => connection()?.saveData === true,
    () => true,
  )
}
