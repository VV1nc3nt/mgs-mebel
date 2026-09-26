/**
 * Demo content for a local database.
 *   pnpm seed        — create or update the demo content
 *   pnpm seed:reset  — delete the demo content (users and hand-made records stay)
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { isLocalDatabaseUrl } from './guard'
import { seed } from './index'

if (!isLocalDatabaseUrl(process.env.DATABASE_URL)) {
  console.error(
    'Seed работает только с локальной БД (localhost, 127.0.0.1, ::1). Проверьте DATABASE_URL.',
  )
  process.exit(1)
}

const payload = await getPayload({ config })
// `payload run` passes only positional arguments to the script, so the mode comes from the env.
const reset = process.env.SEED_RESET === 'true'
let code = 0
try {
  await seed(payload, { reset })
  const counts = await Promise.all(
    (['projects', 'news', 'salons', 'catalogs', 'media'] as const).map(
      async (collection) =>
        `${collection} ${(await payload.count({ collection, overrideAccess: true })).totalDocs}`,
    ),
  )
  console.log(`Итого: ${counts.join(', ')}`)
} catch (error) {
  console.error(error)
  code = 1
} finally {
  await payload.destroy()
}
process.exit(code)
