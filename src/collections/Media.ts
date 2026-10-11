import path from 'path'
import { APIError, type CollectionConfig } from 'payload'

import { preventDeletingUsedMedia } from './mediaUsage'
import { mediaDeleters, mediaUpdaters, anyRole, publicRead } from '@/access'
import { ALL_TAGS, revalidateCollection } from '@/lib/revalidate'

const MB = 1024 * 1024

// A changed file, alt or focal point shows on every page that uses it: rare enough to expire all
// site data instead of tracing the usages. A new file is used nowhere yet; a used one cannot be
// deleted (preventDeletingUsedMedia).
const { afterChange, afterDelete } = revalidateCollection('media', () => ALL_TAGS, {
  onCreate: false,
})

/** Per-type size limits. The global request limit is set in payload.config.ts (`upload.limits`). */
const MAX_SIZE: { prefix: string; bytes: number; label: string }[] = [
  { prefix: 'image/', bytes: 20 * MB, label: 'изображения — 20 МБ' },
  { prefix: 'video/', bytes: 60 * MB, label: 'видео — 60 МБ' },
  { prefix: 'application/pdf', bytes: 100 * MB, label: 'PDF — 100 МБ' },
]

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Файл', plural: 'Медиа' },
  admin: {
    group: 'Контент',
    defaultColumns: ['filename', 'alt', 'mimeType', 'filesize', 'updatedAt'],
  },
  access: {
    read: publicRead,
    create: anyRole,
    update: mediaUpdaters,
    delete: mediaDeleters,
  },
  hooks: {
    afterChange,
    afterDelete,
    beforeDelete: [preventDeletingUsedMedia],
    beforeOperation: [
      ({ args, operation, req }) => {
        if ((operation === 'create' || operation === 'update') && req.file) {
          const { mimetype, size } = req.file
          const limit = MAX_SIZE.find((l) => mimetype.startsWith(l.prefix))
          if (limit && size > limit.bytes) {
            throw new APIError(`Файл слишком большой: максимум для ${limit.label}`, 413, null, true)
          }
        }
        return args
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alt-текст',
      admin: {
        description:
          'Описание изображения для незрячих и поисковиков. Обязательно для изображений.',
      },
      validate: (
        value: string | null | undefined,
        { data }: { data: Partial<{ mimeType: string | null }> },
      ) =>
        data?.mimeType?.startsWith('image/') && !value?.trim()
          ? 'Alt-текст обязателен для изображений'
          : true,
    },
  ],
  upload: {
    // Local disk storage (Docker volume `media` on the server). Ignored when S3 is enabled.
    staticDir: process.env.MEDIA_DIR || path.resolve(process.cwd(), 'media'),
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'video/mp4',
      'video/webm',
      'application/pdf',
    ],
    focalPoint: true,
    imageSizes: [
      { name: 'thumb', width: 480, withoutEnlargement: true },
      { name: 'card', width: 960, withoutEnlargement: true },
      { name: 'hero', width: 1920, withoutEnlargement: true },
      // Open Graph / social preview: cropped to 1200×630 around the focal point.
      { name: 'og', width: 1200, height: 630, withoutEnlargement: true },
    ],
  },
}
