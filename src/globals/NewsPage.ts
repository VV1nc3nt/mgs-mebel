import { labelField, titleField } from '@/fields/section'

import { pageGlobal } from './shared'

export const NewsPage = pageGlobal('newsPage', 'Новости', [
  { name: 'hero', label: 'Заголовок', fields: [labelField(), titleField(true)] },
  {
    name: 'articleCta',
    label: 'Статья: CTA',
    description: 'Лаймовый блок под текстом каждой новости.',
    fields: [
      titleField(),
      { name: 'text', type: 'textarea', label: 'Текст' },
      {
        type: 'row',
        fields: [
          { name: 'primaryLabel', type: 'text', label: 'Кнопка 1 (салоны)' },
          { name: 'secondaryLabel', type: 'text', label: 'Кнопка 2 (расчёт)' },
        ],
      },
    ],
  },
  { name: 'related', label: 'Статья: ещё новости', fields: [titleField()] },
])
