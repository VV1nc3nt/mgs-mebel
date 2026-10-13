import { bgVideoFields, imageField } from '@/fields/media'
import { labelField, textField, titleField } from '@/fields/section'

import { pageGlobal } from './shared'

export const Designers = pageGlobal(
  'designers',
  'Дизайнерам',
  [
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
          maxRows: 6,
          admin: { description: 'Номер 01–06 проставляется автоматически.' },
          fields: [
            imageField('photo', { label: 'Фото 4:3', required: true }),
            { name: 'title', type: 'text', label: 'Заголовок', required: true },
            { name: 'text', type: 'textarea', label: 'Текст' },
          ],
        },
      ],
    },
    {
      name: 'projects',
      label: 'Проекты',
      fields: [
        labelField(),
        titleField(),
        {
          name: 'items',
          type: 'array',
          label: 'Проекты',
          labels: { singular: 'Проект', plural: 'Проекты' },
          admin: {
            description:
              'Порядок — перетаскиванием. Номер проставляется автоматически, скрытые не выводятся и не считаются.',
          },
          fields: [
            {
              name: 'title',
              type: 'text',
              label: 'Название',
              required: true,
              admin: { description: 'Кухня-гостиная, 42 м²' },
            },
            {
              name: 'meta',
              type: 'text',
              label: 'Подпись',
              admin: { description: 'Дизайн — студия … · производство — MGS MEBEL' },
            },
            ...bgVideoFields(),
            { name: 'hidden', type: 'checkbox', label: 'Скрыть', defaultValue: false },
          ],
        },
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
  ],
  { previewPath: '/designers' },
)
