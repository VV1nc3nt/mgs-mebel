'use client'

import { RefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'
import { useSyncExternalStore } from 'react'

const noSubscribe = () => () => {}

/**
 * Live Preview, server variant: the admin posts an event on every save, draft save and autosave,
 * and the page re-renders on the server with the latest draft. The admin is served by this app,
 * so the server URL is the page's own origin (works on any host the site is opened from).
 */
export function LivePreviewRefresh() {
  const router = useRouter()
  const origin = useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => '',
  )
  if (!origin) return null
  return <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={origin} />
}
