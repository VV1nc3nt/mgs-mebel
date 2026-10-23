'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import type { ActionLinkProps } from '@/components/ui/Action'
import { useLiteNetwork } from '@/hooks/useLiteNetwork'
import { PREFETCH_INTENT_MS } from '@/lib/workItemLoader'

/**
 * Link of a project tile to its page (/works «Комплекс», the home preview): the page is fetched
 * ahead on an intent — the mouse over it for PREFETCH_INTENT_MS, a finger on it — not when it
 * comes into view. The page is dynamic: only a full prefetch (`prefetch={true}`) takes its RSC
 * (the default one stops at the first loading boundary, and there is none). Data Saver or a slow
 * connection — nothing ahead. Same props as Action's link (MediaCard renders it in its place).
 */
export function ProjectLink({
  href,
  prefetch: _prefetch,
  disabled: _disabled,
  onPointerEnter,
  onPointerLeave,
  onTouchStart,
  ...rest
}: ActionLinkProps) {
  const lite = useLiteNetwork()
  const [wanted, setWanted] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <Link
      href={href}
      prefetch={wanted && !lite}
      {...rest}
      onPointerEnter={(event) => {
        onPointerEnter?.(event)
        if (event.pointerType !== 'mouse' || wanted) return
        timer.current = window.setTimeout(() => setWanted(true), PREFETCH_INTENT_MS)
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event)
        window.clearTimeout(timer.current)
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event)
        setWanted(true)
      }}
    />
  )
}
