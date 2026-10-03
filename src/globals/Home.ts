import { bgVideoFields } from '@/fields/media'
import { labelField, textField, titleField } from '@/fields/section'

import { historyFields, pageGlobal } from './shared'

export const Home = pageGlobal(
  'home',
  'Главная',
  [
    {
      name: 'hero',
      label: 'Первый экран',
      fields: [
        labelField(),
        titleField(true),
        textField(),
        { name: 'ctaLabel', type: 'text', label: 'Кнопка' },
        ...bgVideoFields(),
      ],
    },
    { name: 'history', label: 'История', fields: historyFields(true) },
    {
      name: 'news',
      label: 'Новости',
      description: 'Слайдер показывает 3 последние опубликованные новости.',
      fields: [labelField(), titleField()],
    },
    {
      name: 'salons',
      label: 'Салоны',
      description:
        'Карта и карточка берут данные из «Салонов»; кнопка карточки — из страницы «Салоны».',
      fields: [labelField(), titleField()],
    },
    {
      name: 'works',
      label: 'Наши работы',
      description:
        'Превью — до 4 работ на категорию: сначала с отметкой «На главной», затем по порядку.',
      fields: [labelField(), titleField(), { name: 'buttonLabel', type: 'text', label: 'Кнопка' }],
    },
  ],
  { previewPath: '/' },
)
