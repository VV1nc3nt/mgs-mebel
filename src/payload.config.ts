import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { s3Storage } from '@payloadcms/storage-s3'
import { ru } from '@payloadcms/translations/languages/ru'
import os from 'os'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Catalogs } from './collections/Catalogs'
import { Items } from './collections/Items'
import { Media } from './collections/Media'
import { News } from './collections/News'
import { Projects } from './collections/Projects'
import { Salons } from './collections/Salons'
import { Users } from './collections/Users'
import { About } from './globals/About'
import { CatalogsPage } from './globals/CatalogsPage'
import { Designers } from './globals/Designers'
import { Home } from './globals/Home'
import { Layout } from './globals/Layout'
import { NewsPage } from './globals/NewsPage'
import { SalonsPage } from './globals/SalonsPage'
import { Settings } from './globals/Settings'
import { Stats } from './globals/Stats'
import { WorksPage } from './globals/WorksPage'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const MB = 1024 * 1024

const pageGlobals = [Home, About, SalonsPage, WorksPage, CatalogsPage, Designers, NewsPage]

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    supportedLanguages: { ru },
    fallbackLanguage: 'ru',
  },
  collections: [Projects, Items, News, Salons, Catalogs, Media, Users],
  globals: [...pageGlobals, Stats, Layout, Settings],
  // Payload defaults are 20 MB per file / 50 MB per request; catalog PDFs are larger.
  // Per-type limits live in collections/Media.ts. Temp files keep large uploads out of RAM.
  upload: {
    limits: { fileSize: 100 * MB },
    requestSizeLimit: 105 * MB,
    useTempFiles: true,
    tempFileDir: os.tmpdir(),
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    prodMigrations: migrations,
  }),
  sharp,
  plugins: [
    seoPlugin({
      collections: ['projects', 'news'],
      globals: pageGlobals.map((g) => g.slug),
      uploadsCollection: 'media',
      tabbedUI: true,
      generateTitle: ({ doc }) => {
        // Home: the hero is a list of segments, the first one names the page.
        const title = doc?.title ?? doc?.hero?.title ?? doc?.hero?.slides?.[0]?.title
        return title ? `${String(title).replace(/\s+/g, ' ')} — MGS MEBEL` : 'MGS MEBEL'
      },
      generateDescription: ({ doc }) =>
        doc?.lead ?? doc?.hero?.lead ?? doc?.hero?.text ?? doc?.hero?.slides?.[0]?.text ?? '',
    }),
    // Media goes to S3 only when S3_BUCKET is set; otherwise files stay on disk (Media.upload.staticDir).
    s3Storage({
      enabled: Boolean(process.env.S3_BUCKET),
      alwaysInsertFields: true,
      collections: { media: { prefix: 'media' } },
      bucket: process.env.S3_BUCKET || '',
      config: {
        endpoint: process.env.S3_ENDPOINT || undefined,
        region: process.env.S3_REGION || 'us-east-1',
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
      },
    }),
  ],
})
