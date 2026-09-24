import config from '@payload-config'
import { connection } from 'next/server'
import { getPayload } from 'payload'

// Liveness + DB check for Docker healthcheck and deploy verification.
export async function GET() {
  await connection()

  try {
    const payload = await getPayload({ config })
    await payload.db.pool.query('SELECT 1')
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json(
      { status: 'error' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
