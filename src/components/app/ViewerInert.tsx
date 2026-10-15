'use client'

import { useSyncExternalStore, type ReactNode } from 'react'

import { isOverlay, subscribeOverlay } from '@/lib/overlay'

/**
 * Parts of the page around <main> (skip link, header, footer, dock): inert while the project
 * viewer covers the page. The viewer lives inside <main>, so the page root cannot be inert as
 * under the menu. `display: contents` — the wrapper adds no box.
 */
export function ViewerInert({ children }: { children: ReactNode }) {
  const open = useSyncExternalStore(
    subscribeOverlay,
    () => isOverlay('viewer'),
    () => false,
  )
  return (
    <div className="contents" inert={open}>
      {children}
    </div>
  )
}
