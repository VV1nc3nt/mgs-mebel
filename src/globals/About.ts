import { bgVideoFields } from '@/fields/media'
import { labelField, textField, titleField } from '@/fields/section'
import { videoPlayerFields } from '@/fields/videoPlayer'

import { heroTab, historyTab } from './sections'
import { pageGlobal } from './shared'

const captionField = { name: 'caption', type: 'text', label: 'Подпись' } as const

// Sections in page order (about README §2).
export const About = pageGlobal(
  'about',
  'О нас',
  [
    heroTab(),
    {
      name: 'intro',
      label: 'Вступление',
      description: 'Абзац по центру, только на desktop. Пусто — блока нет.',
      fields: [
        { name: 'text', type: 'textarea', label: 'Текст' },
        {
          name: 'accent',
          type: 'text',
          label: 'Акцент',
          admin: { description: 'Последняя фраза, выделяется цветом.' },
        },
      ],
    },
    historyTab(),
    {
      // The name in the database stays from the former «Миссия» tab.
      name: 'mission',
      label: 'Видео-презентация',
      description: 'Видео по клику, со звуком. Без постера блока нет.',
      fields: [
        labelField(),
        titleField(),
        textField(),
        ...videoPlayerFields({ fileName: 'video', rule: 'notBoth' }),
      ],
    },
    {
      name: 'hardware',
      label: 'Фурнитура',
      fields: [labelField(), titleField(), textField(), ...bgVideoFields(), captionField],
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
  ],
  { previewPath: '/about' },
)
