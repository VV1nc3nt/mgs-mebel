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
    {
      name: 'project',
      label: 'Страница проекта',
      description: 'Лаймовый блок заявки под галереей проекта.',
      fields: [
        {
          name: 'ctaTitle',
          type: 'text',
          label: 'Заголовок заявки',
          admin: { description: 'Пусто — блока нет. Например, «Хотите так же?».' },
        },
        { name: 'ctaText', type: 'textarea', label: 'Текст заявки' },
        {
          name: 'ctaButton',
          type: 'text',
          label: 'Подпись кнопки',
          admin: { description: 'Кнопка открывает выбор мессенджера. Пусто — без кнопки.' },
        },
      ],
    },
  ],
  { previewPath: '/works' },
)
