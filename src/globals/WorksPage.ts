import { labelField, titleField } from '@/fields/section'

import { pageGlobal } from './shared'

export const WorksPage = pageGlobal(
  'worksPage',
  'Наши работы',
  [
    { name: 'hero', label: 'Заголовок', fields: [labelField(), titleField(true)] },
    {
      name: 'prices',
      label: 'Цены',
      fields: [
        {
          name: 'priceDate',
          type: 'text',
          label: 'Цена актуальна на',
          admin: {
            description:
              'Подпись под ценами проектов и изделий: «Цена актуальна на октябрь 2026». Например, «октябрь 2026».',
          },
        },
      ],
    },
  ],
  { previewPath: '/works' },
)
