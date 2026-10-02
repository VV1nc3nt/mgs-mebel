import { headers } from 'next/headers'

import { hasRole } from '@/access/roles'
import type { User } from '@/payload-types'
import { getPayloadClient } from './payload'

/** Roles that edit page globals (CLAUDE.md «Роли»): only they see drafts on the site. */
export const canPreview = (user: Pick<User, 'role'> | null | undefined): boolean =>
  hasRole(user, 'developer', 'admin', 'content')

/** The logged-in Payload user of this request (admin session cookie), if they may preview. */
export async function getPreviewUser(): Promise<User | null> {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  return user?.collection === 'users' && canPreview(user) ? user : null
}

const BASE = 'http://preview.local'
const BLOCKED = /^\/(admin|api|preview)(\/|$)/

/**
 * Where to go after enabling draft mode: an own site path only. Anything else — another origin,
 * protocol-relative or backslash tricks, the admin, the API — falls back to the home page.
 */
export const safePreviewPath = (raw: string | null | undefined): string => {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/'
  let url: URL
  try {
    url = new URL(raw, BASE)
  } catch {
    return '/'
  }
  if (url.origin !== BASE || BLOCKED.test(url.pathname)) return '/'
  return `${url.pathname}${url.search}${url.hash}`
}
