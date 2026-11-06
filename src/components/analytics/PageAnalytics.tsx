import { draftMode } from 'next/headers'

import { ConsentScripts } from '@/components/cookies/ConsentScripts'
import { PageTracker } from './PageTracker'

/** Call after the page has resolved/validated its data, never from a shared layout or 404. */
export async function PageAnalytics({ path }: { path: string }) {
  if ((await draftMode()).isEnabled) return null
  return (
    <ConsentScripts category="analytics">
      <PageTracker path={path} />
    </ConsentScripts>
  )
}
