import { bgVideoFields, imageField } from '@/fields/media'
import { labelField, textField, titleField } from '@/fields/section'

import { heroTab, historyTab } from './sections'
import { pageGlobal } from './shared'

export const About = pageGlobal('about', 'О нас', [
  heroTab({ cta: false }),
  historyTab({ link: false }),
  { name: 'mission', label: 'Миссия', fields: [labelField(), titleField(), ...bgVideoFields()] },
  {
    name: 'hardware',
    label: 'Фурнитура',
    fields: [
      labelField(),
      titleField(),
      textField(),
      {
        type: 'row',
        fields: [
          {
            name: 'warrantyValue',
            type: 'text',
            label: 'Гарантия: число',
            admin: { description: 'Например, 10' },
          },
          {
            name: 'warrantyUnit',
            type: 'text',
            label: 'Гарантия: единица',
            admin: { description: 'Например, лет' },
          },
        ],
      },
      { name: 'warrantyText', type: 'text', label: 'Гарантия: подпись' },
      {
        name: 'items',
        type: 'array',
        label: 'Фото фурнитуры (сетка 3×2)',
        labels: { singular: 'Фото', plural: 'Фото' },
        maxRows: 6,
        fields: [
          imageField('photo', { label: 'Фото', required: true }),
          { name: 'title', type: 'text', label: 'Подпись', required: true },
        ],
      },
      {
        name: 'qualityWord',
        type: 'text',
        label: 'Слово в карточке',
        admin: { description: 'Например, QUALITY' },
      },
    ],
  },
  {
    name: 'exhibitions',
    label: 'Выставки',
    fields: [
      labelField(),
      titleField(),
      textField(),
      {
        name: 'items',
        type: 'array',
        label: 'Выставки',
        labels: { singular: 'Выставка', plural: 'Выставки' },
        maxRows: 6,
        fields: [
          {
            type: 'row',
            fields: [
              {
                name: 'date',
                type: 'text',
                label: 'Дата',
                required: true,
                admin: { description: '19.02.2026 или 2025' },
              },
              { name: 'title', type: 'text', label: 'Название', required: true },
            ],
          },
          { name: 'text', type: 'textarea', label: 'Текст' },
          ...bgVideoFields(),
        ],
      },
    ],
  },
])
