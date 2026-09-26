/**
 * Demo content for a local database, or for staging with ENABLE_DEMO_SEED=true (deploy/seed.sh).
 *   pnpm seed        — create or update the demo content
 *   pnpm seed:reset  — delete the demo content (users and hand-made records stay)
 * SEED_OFFLINE=true: files only from the cache (SEED_CACHE_DIR), no network.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { isOffline, missingFiles, missingFilesMessage } from './cache'
import { seedFiles } from './files'
import { isSeedAllowed } from './guard'
import { seed } from './index'

if (!isSeedAllowed(process.env)) {
  console.error(
    'Seed запускается только с локальной БД (localhost, 127.0.0.1, ::1) ' +
      'или при ENABLE_DEMO_SEED=true (staging). Проверьте DATABASE_URL.',
  )
  process.exit(1)
}

// `payload run` passes only positional arguments to the script, so the mode comes from the env.
const reset = process.env.SEED_RESET === 'true'

// Offline: refuse before touching the database if any file is missing from the cache.
if (isOffline() && !reset) {
  const missing = await missingFiles(seedFiles)
  if (missing.length) {
    console.error(missingFilesMessage(missing))
    process.exit(1)
  }
}

const payload = await getPayload({ config })
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
