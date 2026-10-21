import { getWorkItem } from '@/lib/queries'

// Edits of the works expire the data cache by tags; the browser keeps nothing
const HEADERS = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }

/**
 * Panel and frames of an item for its view on /works (opened from a tile, prefetched on hover).
 * A GET, not a Server Action: actions are dispatched one at a time per client, so a prefetch in
 * flight would hold back the click on another tile and the change of a feed. Visible items only;
 * not an id, no such item, a hidden one — 404 (a made-up id leaves no cache entry).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const item = await getWorkItem((await params).id)
  if (!item) return new Response(null, { status: 404, headers: HEADERS })
  return Response.json(item, { headers: HEADERS })
}
