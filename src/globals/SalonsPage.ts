import { leadField, labelField, titleField } from '@/fields/section'

import { pageGlobal } from './shared'

export const SalonsPage = pageGlobal('salonsPage', 'Фирменные салоны', [
  { name: 'hero', label: 'Заголовок', fields: [labelField(), titleField(true), leadField()] },
  {
    name: 'map',
    label: 'Карта',
    fields: [
      {
        name: 'listCaption',
        type: 'text',
        label: 'Подпись к счётчику в списке',
        admin: { description: 'После числа салонов, например «в Москве и области».' },
      },
      {
        name: 'cardCtaLabel',
        type: 'text',
        label: 'Кнопка карточки салона',
        admin: { description: 'Используется и на Главной.' },
      },
      {
        name: 'emptyText',
        type: 'text',
        label: 'Если салонов нет',
        defaultValue: 'Скоро откроемся',
        admin: { description: 'Вместо карточек и карты; ниже — телефон горячей линии.' },
      },
    ],
  },
])
