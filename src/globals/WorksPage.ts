import { labelField, titleField } from '@/fields/section'

import { pageGlobal } from './shared'

export const WorksPage = pageGlobal('worksPage', 'Наши работы', [
  { name: 'hero', label: 'Заголовок', fields: [labelField(), titleField(true)] },
  {
    name: 'viewer',
    label: 'Просмотр проекта',
    fields: [
      {
        name: 'ctaLabel',
        type: 'text',
        label: 'Кнопка',
        admin: { description: 'Например, «Хочу такой же проект»' },
      },
    ],
  },
])
