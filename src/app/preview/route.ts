import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import { getPreviewUser, safePreviewPath } from '@/lib/preview'

/**
 * Enables draft mode for an editor and opens the page: `/preview?path=/`. Used as the Live Preview
 * URL of page globals. Without a valid admin session of an editing role nothing is enabled.
 */
export async function GET(request: NextRequest) {
  if (!(await getPreviewUser())) {
    return new Response('Предпросмотр доступен только редакторам после входа в админку', {
      status: 401,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
  ;(await draftMode()).enable()
  redirect(safePreviewPath(request.nextUrl.searchParams.get('path')))
}
