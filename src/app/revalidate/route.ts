import { createHash, timingSafeEqual } from 'node:crypto'

import { ALL_TAGS, expireTags } from '@/lib/revalidate'

const NO_STORE = { 'Cache-Control': 'no-store' }

// Digests have the same length whatever the input, so the comparison time does not depend on it.
const digest = (value: string) => createHash('sha256').update(value).digest()

const authorized = (header: string | null): boolean => {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret || !header) return false
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`))
}

/**
 * Expires all site data. For writes that bypass the Payload hooks: the staging seed runs in its
 * own process, a database restored from a backup. `Authorization: Bearer <REVALIDATE_SECRET>`;
 * without the variable on the server the endpoint never accepts.
 */
export async function POST(request: Request) {
  if (!authorized(request.headers.get('authorization'))) {
    return new Response(null, { status: 401, headers: NO_STORE })
  }
  expireTags(ALL_TAGS)
  return Response.json({ revalidated: ALL_TAGS.length }, { headers: NO_STORE })
}
