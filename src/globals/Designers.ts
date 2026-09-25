import { bgVideoFields, imageField } from '@/fields/media'
import { labelField, textField, titleField } from '@/fields/section'

import { pageGlobal } from './shared'

export const Designers = pageGlobal('designers', 'Дизайнерам', [
  {
    name: 'hero',
    label: 'Первый экран',
    fields: [
      labelField(),
      {
        name: 'title',
        type: 'textarea',
        label: 'Заголовок',
        required: true,
        admin: { description: 'Перенос строки сохраняется.' },
      },
      textField(),
      {
        name: 'audiences',
        type: 'array',
        label: 'Чипы',
        labels: { singular: 'Чип', plural: 'Чипы' },
        maxRows: 3,
        fields: [{ name: 'label', type: 'text', label: 'Текст', required: true }],
      },
      ...bgVideoFields(),
    ],
  },
  {
    name: 'capabilities',
    label: 'Возможности',
    fields: [
      labelField(),
      titleField(),
      {
        name: 'items',
        type: 'array',
        label: 'Карточки',
        labels: { singular: 'Карточка', plural: 'Карточки' },
        maxRows: 4,
        admin: { description: 'Номер 01–04 проставляется автоматически.' },
        fields: [
          imageField('photo', { label: 'Фото 4:3', required: true }),
          { name: 'title', type: 'text', label: 'Заголовок', required: true },
          { name: 'text', type: 'textarea', label: 'Текст' },
        ],
      },
    ],
  },
  {
    name: 'project',
    label: 'Проект',
    fields: [
      labelField(),
      titleField(),
      ...bgVideoFields(),
      { name: 'caption', type: 'text', label: 'Подпись' },
      { name: 'subcaption', type: 'text', label: 'Вторая строка подписи' },
    ],
  },
  {
    name: 'cooperation',
    label: 'Сотрудничество',
    description: 'Менеджер и его контакты — в «Настройках».',
    fields: [
      labelField(),
      titleField(),
      { name: 'messengersLabel', type: 'text', label: 'Подпись над мессенджерами' },
    ],
  },
])
