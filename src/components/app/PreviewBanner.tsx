import { draftMode } from 'next/headers'

import { getPreviewUser } from '@/lib/preview'
import { PreviewBannerBar } from './PreviewBannerBar'

/** Shown only in draft mode to an editor with a valid admin session (the one who sees drafts). */
export async function PreviewBanner() {
  if (!(await draftMode()).isEnabled || !(await getPreviewUser())) return null
  return <PreviewBannerBar />
}
