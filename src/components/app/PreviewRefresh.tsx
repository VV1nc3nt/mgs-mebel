import { draftMode } from 'next/headers'

import { LivePreviewRefresh } from './LivePreviewRefresh'

/** Put on every page with Live Preview: refreshes it on save while in draft mode. */
export async function PreviewRefresh() {
  if (!(await draftMode()).isEnabled) return null
  return <LivePreviewRefresh />
}
