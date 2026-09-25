import type { PayloadRequest, UploadField, Validate } from 'payload'
import { upload as validateUpload } from 'payload/shared'

export type MediaKind = 'image' | 'video' | 'pdf'

const MIME_PREFIX: Record<MediaKind, string> = {
  image: 'image/',
  video: 'video/',
  pdf: 'application/pdf',
}

const KIND_LABEL: Record<MediaKind, string> = {
  image: 'изображение',
  video: 'видео (mp4, webm)',
  pdf: 'PDF',
}

type UploadValue = number | string | { id: number | string } | null | undefined

const toId = (value: UploadValue): number | string | null =>
  value && typeof value === 'object' ? value.id : (value ?? null)

/** Returns an error message if any of the referenced media files is not of the given kind. */
export const checkMediaKind = async (
  value: UploadValue | UploadValue[],
  kind: MediaKind,
  req: PayloadRequest,
): Promise<string | true> => {
  const ids = (Array.isArray(value) ? value : [value]).map(toId).filter((id) => id !== null)
  for (const id of ids) {
    const doc = await req.payload
      .findByID({ collection: 'media', id, depth: 0, select: { mimeType: true }, req })
      .catch(() => null)
    if (doc?.mimeType && !doc.mimeType.startsWith(MIME_PREFIX[kind])) {
      return `Нужен файл типа: ${KIND_LABEL[kind]}`
    }
  }
  return true
}

type MediaFieldOptions = Omit<Partial<UploadField>, 'type' | 'relationTo' | 'name' | 'hasMany'> & {
  hasMany?: boolean
  /** Extra check run after the type check. */
  extraValidate?: Validate
}

export const mimeFilter = (kind: MediaKind) => ({
  mimeType: kind === 'pdf' ? { equals: MIME_PREFIX.pdf } : { like: MIME_PREFIX[kind] },
})

/**
 * Upload field limited to one media kind: filtered in the admin picker and checked on the server.
 * `kind: null` skips the built-in type check (use `filterOptions` + `extraValidate` instead).
 */
export const mediaField = (
  name: string,
  kind: MediaKind | null,
  { extraValidate, hasMany, ...options }: MediaFieldOptions = {},
): UploadField =>
  ({
    filterOptions: kind ? mimeFilter(kind) : undefined,
    ...options,
    name,
    type: 'upload',
    relationTo: 'media',
    hasMany,
    validate: async (value: unknown, args: Parameters<Validate>[1]) => {
      const base = await validateUpload(value as never, args as never)
      if (base !== true) return base
      if (extraValidate) {
        const extra = await extraValidate(value, args)
        if (extra !== true) return extra
      }
      return kind ? checkMediaKind(value as UploadValue | UploadValue[], kind, args.req) : true
    },
  }) as UploadField

export const imageField = (name: string, options?: MediaFieldOptions) =>
  mediaField(name, 'image', options)
export const videoField = (name: string, options?: MediaFieldOptions) =>
  mediaField(name, 'video', options)
export const pdfField = (name: string, options?: MediaFieldOptions) =>
  mediaField(name, 'pdf', options)

/** Background video: the video is optional, the poster is always required (README §7). */
export const bgVideoFields = (): UploadField[] => [
  videoField('video', {
    label: 'Фоновое видео',
    admin: { description: 'MP4 или WebM, 8–15 с, до 5 МБ, без звука. Необязательно.' },
  }),
  imageField('poster', {
    label: 'Постер',
    required: true,
    admin: {
      description:
        'Показывается до загрузки видео и вместо него (экономия трафика, reduced motion).',
    },
  }),
]
