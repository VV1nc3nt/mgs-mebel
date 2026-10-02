/**
 * E2E data of the home page: the `home` and `stats` globals with the seed texts and images
 * generated on the fly (no stock downloads, no binaries in git), then a draft over the published
 * home for the «anonymous never sees drafts» check. Local database only.
 *   NODE_ENV=production pnpm payload run tests/helpers/seedHome.ts
 */
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'

import { globals } from '../../src/seed/data/globals'
import { isLocalDatabaseUrl } from '../../src/seed/guard'
import { HOME_DRAFT_TITLE } from './e2eHome'

if (!isLocalDatabaseUrl(process.env.DATABASE_URL)) {
  console.error('seedHome: только локальная БД (localhost, 127.0.0.1, ::1)')
  process.exit(1)
}

// A light poster: the menu and the hero text are checked over a bright photo (README §3).
const IMAGES = {
  poster: { file: 'e2e-home-poster.png', width: 1920, height: 1080, color: '#e8e4dc' },
  main: { file: 'e2e-home-history-main.png', width: 900, height: 1200, color: '#b9a48c' },
  secondary: { file: 'e2e-home-history-secondary.png', width: 900, height: 900, color: '#8c9aa4' },
} as const

const upsertImage = async (payload: Payload, image: (typeof IMAGES)[keyof typeof IMAGES]) => {
  const { docs } = await payload.find({
    collection: 'media',
    where: { filename: { equals: image.file } },
    limit: 1,
    depth: 0,
  })
  if (docs[0]) return docs[0].id
  const data = await sharp({
    create: { width: image.width, height: image.height, channels: 3, background: image.color },
  })
    .png()
    .toBuffer()
  const doc = await payload.create({
    collection: 'media',
    data: { alt: 'Тестовое изображение' },
    file: { data, mimetype: 'image/png', name: image.file, size: data.length },
  })
  return doc.id
}

const payload = await getPayload({ config })
let code = 0
try {
  const ids = {
    poster: await upsertImage(payload, IMAGES.poster),
    main: await upsertImage(payload, IMAGES.main),
    secondary: await upsertImage(payload, IMAGES.secondary),
  }
  // Seed media keys: U1 — hero poster, U2 / U3 — history photos; no background video here.
  const byKey: Record<string, number> = { U1: ids.poster, U2: ids.main, U3: ids.secondary }
  const { home, stats } = globals((key) => byKey[key] ?? ids.poster)
  const published = { ...home, hero: { ...home.hero, video: null } }

  await payload.updateGlobal({ slug: 'stats', data: stats, depth: 0 })
  await payload.updateGlobal({
    slug: 'home',
    data: { ...published, _status: 'published' },
    depth: 0,
  })
  await payload.updateGlobal({
    slug: 'home',
    data: { ...published, hero: { ...published.hero, title: HOME_DRAFT_TITLE } },
    draft: true,
    depth: 0,
  })
  console.log('seedHome: stats, home (published + draft)')
} catch (error) {
  console.error(error)
  code = 1
} finally {
  await payload.destroy()
}
process.exit(code)
