import type { Field, GlobalConfig, Tab } from 'payload'

import { contentEditors, publicRead } from '@/access'
import { imageField } from '@/fields/media'
import { labelField, textField } from '@/fields/section'

/** Page global: one named tab per page section, in page order (README §6). */
export const pageGlobal = (
  slug: string,
  label: string,
  tabs: Tab[],
  group = 'Страницы',
): GlobalConfig => ({
  slug,
  label,
  admin: { group },
  access: { read: publicRead, update: contentEditors },
  fields: [{ type: 'tabs', tabs }],
})

/** Company history block (Home §6.1 п.3, About §6.2). */
export const historyFields = (withLink: boolean): Field[] => [
  labelField(),
  imageField('photoMain', { label: 'Фото 3:4', required: true }),
  {
    type: 'row',
    fields: [
      {
        name: 'yearValue',
        type: 'text',
        label: 'Плашка: год',
        admin: { description: 'Например, 2001' },
      },
      { name: 'yearCaption', type: 'text', label: 'Плашка: подпись' },
    ],
  },
  imageField('photoSecondary', { label: 'Фото 1:1' }),
  { name: 'lead', type: 'textarea', label: 'Лид' },
  textField(),
  {
    name: 'values',
    type: 'array',
    label: 'Ценности (чипы)',
    labels: { singular: 'Ценность', plural: 'Ценности' },
    maxRows: 6,
    fields: [{ name: 'label', type: 'text', label: 'Текст', required: true }],
  },
  ...(withLink
    ? [{ name: 'linkLabel', type: 'text', label: 'Ссылка «Подробнее»' } satisfies Field]
    : []),
]
