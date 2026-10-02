/**
 * E2E data: only the `layout` global and the public part of `settings`, with the seed texts and
 * no media — no stock downloads, no staging — and an editor account for the preview tests.
 * Local database only.
 *   pnpm payload run tests/helpers/seedChrome.ts
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { globals } from '../../src/seed/data/globals'
import { isLocalDatabaseUrl } from '../../src/seed/guard'
import { e2eEditor } from './e2eEditor'

if (!isLocalDatabaseUrl(process.env.DATABASE_URL)) {
  console.error('seedChrome: только локальная БД (localhost, 127.0.0.1, ::1)')
  process.exit(1)
}

const payload = await getPayload({ config })
let code = 0
try {
  // Media ids are irrelevant: layout has no media, settings is written without designerManager.
  const { layout, settings } = globals(() => 0)
  await payload.updateGlobal({ slug: 'layout', data: layout, depth: 0 })
  await payload.updateGlobal({
    slug: 'settings',
    data: { contacts: settings.contacts, messengers: settings.messengers },
    depth: 0,
  })
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: e2eEditor.email } },
    limit: 1,
    depth: 0,
  })
  if (!docs[0]) await payload.create({ collection: 'users', data: e2eEditor })
  console.log('seedChrome: layout, settings, editor')
} catch (error) {
  console.error(error)
  code = 1
} finally {
  await payload.destroy()
}
process.exit(code)
