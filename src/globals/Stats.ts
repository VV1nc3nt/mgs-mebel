import type { GlobalConfig } from 'payload'

import { contentEditors, publicRead } from '@/access'

export const Stats: GlobalConfig = {
  slug: 'stats',
  label: 'Цифры',
  admin: { group: 'Страницы', description: 'Блок статистики на Главной и странице «О нас».' },
  access: { read: publicRead, update: contentEditors },
  fields: [
    {
      name: 'items',
      type: 'array',
      label: 'Цифры',
      labels: { singular: 'Цифра', plural: 'Цифры' },
      maxRows: 6,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'value',
              type: 'text',
              label: 'Значение',
              required: true,
              admin: { description: 'Например, 1000+' },
            },
            { name: 'label', type: 'text', label: 'Подпись', required: true },
          ],
        },
      ],
    },
  ],
}
