import type { CollectionConfig } from 'payload'

import { anyRole, publicRead } from '@/access'
import { imageField, pdfField } from '@/fields/media'
import { revalidateCollection } from '@/lib/revalidate'

export const catalogCategoryOptions = [
  { label: 'Кухни', value: 'kitchens' },
  { label: 'Гардеробные', value: 'wardrobes' },
  { label: 'Фасады', value: 'facades' },
  { label: 'Ванные', value: 'bathrooms' },
  { label: 'Столы и стулья', value: 'tables' },
]

export const Catalogs: CollectionConfig = {
  slug: 'catalogs',
  labels: { singular: 'Каталог', plural: 'Каталоги' },
  admin: {
    group: 'Контент',
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'pages', 'order'],
  },
  defaultSort: 'order',
  access: {
    read: publicRead,
    create: anyRole,
    update: anyRole,
    delete: anyRole,
  },
  hooks: revalidateCollection('catalogs'),
  fields: [
    { name: 'title', type: 'text', label: 'Название', required: true },
    {
      name: 'category',
      type: 'select',
      label: 'Категория',
      required: true,
      options: catalogCategoryOptions,
    },
    imageField('cover', { label: 'Обложка', required: true }),
    pdfField('pdf', {
      label: 'PDF',
      required: true,
      admin: { description: 'Размер файла на сайте берётся из загруженного PDF.' },
    }),
    { name: 'pages', type: 'number', label: 'Страниц', min: 1 },
    {
      name: 'order',
      type: 'number',
      label: 'Порядок',
      admin: { position: 'sidebar', description: 'Меньше — выше.' },
    },
  ],
}
