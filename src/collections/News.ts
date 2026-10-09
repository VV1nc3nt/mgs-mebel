import { slugField, type CollectionConfig } from 'payload'

import { contentEditors, publishedOrLoggedIn } from '@/access'
import { newsBlocks } from '@/blocks/news'
import { imageField, videoField } from '@/fields/media'
import { readingTime } from '@/lib/readingTime'
import { slugify } from '@/lib/slugify'

export const News: CollectionConfig = {
  slug: 'news',
  labels: { singular: 'Новость', plural: 'Новости' },
  admin: {
    group: 'Контент',
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'date', '_status'],
  },
  defaultSort: '-date',
  versions: { drafts: true },
  access: {
    read: publishedOrLoggedIn,
    readVersions: contentEditors,
    create: contentEditors,
    update: contentEditors,
    delete: contentEditors,
  },
  hooks: {
    beforeChange: [({ data }) => ({ ...data, readingTime: readingTime(data.body) })],
  },
  fields: [
    { name: 'title', type: 'text', label: 'Заголовок', required: true },
    slugField({
      useAsSlug: 'title',
      slugify: ({ valueToSlugify }) => slugify(String(valueToSlugify ?? '')),
    }),
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'select',
          label: 'Тип',
          required: true,
          defaultValue: 'news',
          options: [
            { label: 'Новость', value: 'news' },
            { label: 'Новинка', value: 'new' },
          ],
        },
        {
          name: 'date',
          type: 'date',
          label: 'Дата',
          required: true,
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } },
        },
      ],
    },
    { name: 'lead', type: 'textarea', label: 'Лид' },
    imageField('cover', { label: 'Обложка', required: true }),
    videoField('coverVideo', {
      label: 'Видео обложки',
      admin: { description: 'MP4/WebM, 8–15 с, до 5 МБ, без звука. Необязательно; поверх обложки' },
    }),
    {
      name: 'readingTime',
      type: 'number',
      label: 'Время чтения, мин',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Считается автоматически: слова / 180.',
      },
    },
    {
      name: 'body',
      type: 'blocks',
      label: 'Текст статьи',
      blocks: newsBlocks,
    },
  ],
}
