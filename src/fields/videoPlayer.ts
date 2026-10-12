import type { Field, RowField } from 'payload'

import { isAllowedEmbedUrl } from '@/lib/embed'

import { imageField, videoField } from './media'

/**
 * Where the video comes from: `exactlyOne` — a file or a link, one of them (news video block);
 * `notBoth` — a file, a link or neither (a poster without ▶, the «О нас» presentation).
 */
export type VideoSourceRule = 'exactlyOne' | 'notBoth'

export const checkVideoSource = (
  rule: VideoSourceRule,
  file: unknown,
  embedUrl: string | null | undefined,
): string | true => {
  if (file && embedUrl) return 'Укажите что-то одно: файл или ссылку'
  if (rule === 'exactlyOne' && !file && !embedUrl) return 'Загрузите видео или укажите ссылку'
  return true
}

export const validateEmbedUrl = (value: string | null | undefined): string | true =>
  !value || isAllowedEmbedUrl(value)
    ? true
    : 'Поддерживаются только ссылки https на RuTube и VK Видео'

type VideoPlayerOptions = {
  /** Name of the file field (`file` in the news block, `video` in «О нас»). */
  fileName: string
  rule: VideoSourceRule
  /** Fields next to the duration in one row (the news block: vertical, wide). */
  durationRow?: RowField['fields']
}

/**
 * A video played on a click, with sound (poster → player): a file or a RuTube / VK link, the
 * poster, the duration and the caption.
 */
export const videoPlayerFields = ({
  fileName,
  rule,
  durationRow = [],
}: VideoPlayerOptions): Field[] => [
  videoField(fileName, {
    label: 'Видеофайл',
    admin: {
      description:
        rule === 'exactlyOne'
          ? 'MP4 или WebM, можно со звуком. Файл или ссылка ниже — что-то одно.'
          : 'MP4 или WebM, можно со звуком. Файл или ссылка ниже — не оба сразу; без них — только постер.',
    },
    extraValidate: (value, { siblingData }) =>
      checkVideoSource(rule, value, (siblingData as { embedUrl?: string | null })?.embedUrl),
  }),
  {
    name: 'embedUrl',
    type: 'text',
    label: 'Ссылка на видео',
    admin: { description: 'RuTube или VK Видео.' },
    validate: validateEmbedUrl,
  },
  imageField('poster', { label: 'Постер', required: true }),
  {
    type: 'row',
    fields: [
      {
        name: 'duration',
        type: 'text',
        label: 'Длительность',
        admin: { description: 'Например, 1:24' },
      },
      ...durationRow,
    ],
  },
  { name: 'caption', type: 'text', label: 'Подпись' },
]
