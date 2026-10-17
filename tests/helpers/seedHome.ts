/**
 * E2E data of the pages: the `home`, `about`, `salonsPage`, `worksPage`, `catalogsPage`, `designers`, `newsPage` and
 * `stats` globals, the designer manager of `settings`, news, projects, salons and catalogs with the seed
 * texts and media generated on the fly (no stock downloads, no binaries in git), then a draft
 * over the published home and a news draft for the «anonymous never sees drafts» checks.
 * Local database only.
 *   NODE_ENV=production pnpm payload run tests/helpers/seedHome.ts
 */
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'

import { globals } from '../../src/seed/data/globals'
import { news } from '../../src/seed/data/news'
import { projects } from '../../src/seed/data/projects'
import { salons } from '../../src/seed/data/salons'
import { isLocalDatabaseUrl } from '../../src/seed/guard'
import { placeholderPdf } from '../../src/seed/pdf'
import { catalogPdfFile, E2E_CATALOGS } from './e2eCatalogs'
import { E2E_MANAGER, E2E_PROJECTS } from './e2eDesigners'
import { articleBody, E2E_ARTICLE } from './e2eArticle'
import { E2E_EXTRA_NEWS } from './e2eNews'
import {
  ABOUT_CTA,
  E2E_NEWS_COUNT,
  E2E_SALONS,
  HOME_DRAFT_TITLE,
  NEWS_DRAFT_SLUG,
  NEWS_DRAFT_TITLE,
} from './e2eHome'

if (!isLocalDatabaseUrl(process.env.DATABASE_URL)) {
  console.error('seedHome: только локальная БД (localhost, 127.0.0.1, ::1)')
  process.exit(1)
}

// A light poster: the menu and the hero text are checked over a bright photo (README §3).
// The second hero segment gets a poster of its own.
const IMAGES = {
  poster: { file: 'e2e-home-poster.png', width: 1920, height: 1080, color: '#e8e4dc' },
  poster2: { file: 'e2e-home-poster-2.png', width: 1920, height: 1080, color: '#cfc6b8' },
  main: { file: 'e2e-home-history-main.png', width: 900, height: 1200, color: '#b9a48c' },
  secondary: { file: 'e2e-home-history-secondary.png', width: 900, height: 900, color: '#8c9aa4' },
} as const

// Covers of news and project photos: a few colors, picked by the seed media key.
const PHOTOS = ['#6f5b4a', '#4a5f6f', '#7a6a3c', '#3c5a4a', '#5a3c4a', '#8a8070'].map(
  (color, i) => ({ file: `e2e-photo-${i + 1}.png`, width: 1200, height: 1600, color }),
)

type ImageSpec = { file: string; width: number; height: number; color: string }

const findMedia = async (payload: Payload, file: string) => {
  const { docs } = await payload.find({
    collection: 'media',
    where: { filename: { equals: file } },
    limit: 1,
    depth: 0,
  })
  return docs[0]?.id
}

const upsertImage = async (payload: Payload, image: ImageSpec) => {
  const existing = await findMedia(payload, image.file)
  if (existing) return existing
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

/**
 * The smallest file the upload accepts as an MP4: an `ftyp` box (ISO base media, brand isom)
 * and an empty `free` box after it (a file of `ftyp` alone is rejected). Enough for the upload
 * checks, the «video project» markers and the background video fallback of «О нас» (whether a
 * browser can play it depends on its codecs, so the fallback checks intercept the request).
 */
const MP4 = Buffer.concat([
  Buffer.from([0, 0, 0, 24]),
  Buffer.from('ftypisom', 'ascii'),
  Buffer.from([0, 0, 2, 0]),
  Buffer.from('isommp41', 'ascii'),
  Buffer.from([0, 0, 0, 8]),
  Buffer.from('free', 'ascii'),
])
const VIDEO_FILE = 'e2e-reel.mp4'

/** The video of the reels projects, salon cards and «О нас», or null if the upload rejects it. */
const upsertVideo = async (payload: Payload) => {
  const existing = await findMedia(payload, VIDEO_FILE)
  if (existing) return existing
  try {
    const doc = await payload.create({
      collection: 'media',
      data: {},
      file: { data: MP4, mimetype: 'video/mp4', name: VIDEO_FILE, size: MP4.length },
    })
    return doc.id
  } catch (error) {
    console.warn('seedHome: видео не загружено, reels без работ —', (error as Error).message)
    return null
  }
}

const upsertFile = async (payload: Payload, name: string, mimetype: string, data: Buffer) => {
  const existing = await findMedia(payload, name)
  if (existing) return existing
  const doc = await payload.create({
    collection: 'media',
    data: mimetype.startsWith('image/') ? { alt: 'Тестовый рендер каталога' } : {},
    file: { data, mimetype, name, size: data.length },
  })
  return doc.id
}

/** A catalog render: a light «booklet» on a transparent background (PNG with alpha). */
const renderPng = () =>
  sharp({
    create: { width: 800, height: 600, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: { create: { width: 360, height: 480, channels: 4, background: '#d8d2c6' } },
        left: 220,
        top: 60,
      },
    ])
    .png()
    .toBuffer()

const upsertBySlug = async (
  payload: Payload,
  collection: 'news' | 'projects',
  slug: string,
  create: () => Promise<unknown>,
) => {
  const { totalDocs } = await payload.count({
    collection,
    where: { slug: { equals: slug } },
    // Drafts count as existing too
    ...(collection === 'news' ? { draft: true } : {}),
  })
  if (!totalDocs) await create()
}

const payload = await getPayload({ config })
let code = 0
try {
  const ids = {
    poster: await upsertImage(payload, IMAGES.poster),
    poster2: await upsertImage(payload, IMAGES.poster2),
    main: await upsertImage(payload, IMAGES.main),
    secondary: await upsertImage(payload, IMAGES.secondary),
  }
  const videoId = await upsertVideo(payload)
  // Seed media keys: P1 / P2 — home hero posters, U1 — «О нас» hero poster, U2 / U3 — history
  // photos; other posters of «О нас» get the light poster. No background videos on the home page.
  const byKey: Record<string, number> = {
    P1: ids.poster,
    P2: ids.poster2,
    U1: ids.poster,
    U2: ids.main,
    U3: ids.secondary,
  }
  const { home, about, stats, salonsPage, worksPage, catalogsPage, designers, newsPage } = globals(
    (key) => byKey[key] ?? ids.poster,
  )
  const slides = home.hero?.slides?.map((slide) => ({ ...slide, video: null })) ?? []
  const published = { ...home, hero: { ...home.hero, slides } }

  await payload.updateGlobal({ slug: 'stats', data: stats, depth: 0 })
  await payload.updateGlobal({
    slug: 'home',
    data: { ...published, _status: 'published' },
    depth: 0,
  })
  // «О нас», published without a draft. The minimal mp4 for every video the page plays: the
  // hero, the presentation, the hardware and the 1st and 3rd exhibitions (the 2nd has a poster
  // only). The hero CTA is set here: the seed has none.
  await payload.updateGlobal({
    slug: 'about',
    data: {
      ...about,
      hero: { ...about.hero, ctaLabel: ABOUT_CTA, video: videoId },
      mission: { ...about.mission, video: videoId },
      hardware: { ...about.hardware, video: videoId },
      exhibitions: {
        ...about.exhibitions,
        items: about.exhibitions?.items?.map((item, i) => ({
          ...item,
          video: i === 0 || i === 2 ? videoId : null,
        })),
      },
      _status: 'published',
    },
    depth: 0,
  })
  // The home salon card takes its button label from the «Салоны» page.
  await payload.updateGlobal({
    slug: 'salonsPage',
    data: { ...salonsPage, _status: 'published' },
    depth: 0,
  })
  await payload.updateGlobal({
    slug: 'home',
    data: {
      ...published,
      hero: {
        ...published.hero,
        slides: slides.map((slide, i) => (i === 0 ? { ...slide, title: HOME_DRAFT_TITLE } : slide)),
      },
    },
    draft: true,
    depth: 0,
  })

  // Seed media keys: V* / H* — videos, the rest — photos.
  const photoIds = await Promise.all(PHOTOS.map((image) => upsertImage(payload, image)))
  const photoOf = (key: string) =>
    photoIds[[...key].reduce((sum, c) => sum + c.charCodeAt(0), 0) % photoIds.length]!
  const media = (key: string) => (/^[VH]\d/.test(key) && videoId ? videoId : photoOf(key))

  // News: the bodies are not needed on the home page; a newer draft must stay invisible.
  const publishedNews = news(media).slice(0, E2E_NEWS_COUNT)
  for (const item of publishedNews) {
    await upsertBySlug(payload, 'news', item.slug!, () =>
      payload.create({ collection: 'news', data: { ...item, body: [] }, depth: 0 }),
    )
  }
  // More published news for the news page (older than the ones above, in creation order). The
  // first carries the article body of the news page checks (links to a home news item).
  const { docs: linked } = await payload.find({
    collection: 'news',
    where: { slug: { equals: publishedNews[1]!.slug } },
    limit: 1,
    depth: 0,
  })
  for (const [i, item] of E2E_EXTRA_NEWS.entries()) {
    const article = item.slug === E2E_ARTICLE.slug
    const body = article
      ? articleBody(
          {
            photo: photoIds[0]!,
            wide: photoIds[1]!,
            gallery: [photoIds[2]!, photoIds[3]!],
            video: videoId,
          },
          linked[0]!.id,
        )
      : []
    await upsertBySlug(payload, 'news', item.slug, () =>
      payload.create({
        collection: 'news',
        data: {
          ...item,
          // The article has no lead: the head of the page without it is checked
          lead: article ? null : item.lead,
          cover: photoIds[i % photoIds.length]!,
          body,
          _status: 'published',
        },
        depth: 0,
      }),
    )
  }
  await payload.updateGlobal({
    slug: 'newsPage',
    data: { ...newsPage, _status: 'published' },
    depth: 0,
  })
  await upsertBySlug(payload, 'news', NEWS_DRAFT_SLUG, () =>
    payload.create({
      collection: 'news',
      data: {
        ...publishedNews[0]!,
        title: NEWS_DRAFT_TITLE,
        slug: NEWS_DRAFT_SLUG,
        date: '2027-01-01T12:00:00.000Z',
        body: [],
        _status: 'draft',
      },
      draft: true,
      depth: 0,
    }),
  )

  // Projects of every category; without the video the video slides are dropped.
  for (const project of projects(media)) {
    const slides = videoId ? project.slides : project.slides.filter((s) => s.type !== 'video')
    await upsertBySlug(payload, 'projects', project.slug!, () =>
      payload.create({ collection: 'projects', data: { ...project, slides }, depth: 0 }),
    )
  }
  // Salons: the order, the missing phone and the videos come from E2E_SALONS; card photos are
  // the generated 3:4 photos.
  const seedSalons = salons(media)
  for (const [i, name] of E2E_SALONS.entries()) {
    const salon = seedSalons.find((item) => item.name === name)!
    const { totalDocs } = await payload.count({
      collection: 'salons',
      where: { name: { equals: name } },
    })
    if (totalDocs) continue
    await payload.create({
      collection: 'salons',
      data: {
        ...salon,
        order: i + 1,
        phone: i === E2E_SALONS.length - 1 ? null : salon.phone,
        reviewVideo: i === 0 || i === 2 ? videoId : null,
      },
      depth: 0,
    })
  }
  // «Наши работы»: the heading (the projects are above), published without a draft.
  await payload.updateGlobal({
    slug: 'worksPage',
    data: { ...worksPage, _status: 'published' },
    depth: 0,
  })
  // «Каталоги»: the heading and the catalogs of E2E_CATALOGS (covers — the generated photos).
  await payload.updateGlobal({
    slug: 'catalogsPage',
    data: { ...catalogsPage, _status: 'published' },
    depth: 0,
  })
  const renderId = await upsertFile(
    payload,
    'e2e-catalog-render.png',
    'image/png',
    await renderPng(),
  )
  for (const [i, catalog] of E2E_CATALOGS.entries()) {
    const { totalDocs } = await payload.count({
      collection: 'catalogs',
      where: { title: { equals: catalog.title } },
    })
    if (totalDocs) continue
    const pdf = await upsertFile(
      payload,
      catalogPdfFile(i),
      'application/pdf',
      placeholderPdf(catalog.title),
    )
    await payload.create({
      collection: 'catalogs',
      data: {
        title: catalog.title,
        category: catalog.category,
        pages: catalog.pages,
        cover: photoIds[i % photoIds.length]!,
        render: catalog.render ? renderId : null,
        pdf,
        order: i + 1,
      },
      depth: 0,
    })
  }
  // «Дизайнерам», published without a draft: the seed texts and the six capabilities with the
  // generated photos, the projects of E2E_PROJECTS; the manager — a phone and two messengers.
  await payload.updateGlobal({
    slug: 'designers',
    data: {
      ...designers,
      hero: { ...designers.hero, video: videoId },
      capabilities: {
        ...designers.capabilities,
        items: designers.capabilities?.items?.map((item, i) => ({
          ...item,
          photo: photoIds[i % photoIds.length]!,
        })),
      },
      projects: {
        ...designers.projects,
        items: E2E_PROJECTS.map((project, i) => ({
          title: project.title,
          meta: 'Дизайн — студия партнёра · производство — MGS MEBEL',
          poster: photoIds[i % photoIds.length]!,
          video: project.video ? videoId : null,
          hidden: project.hidden ?? false,
        })),
      },
      _status: 'published',
    },
    depth: 0,
  })
  await payload.updateGlobal({
    slug: 'settings',
    data: { designerManager: { ...E2E_MANAGER, photo: photoIds[0]! } },
    depth: 0,
  })
  console.log(
    'seedHome: stats, home (published + draft), about, salonsPage, worksPage, catalogsPage, designers, newsPage, settings.designerManager, news, projects, salons, catalogs',
  )
} catch (error) {
  console.error(error)
  code = 1
} finally {
  await payload.destroy()
}
process.exit(code)
