import { labelField, titleField } from '@/fields/section'
import { checkMaxTemplate } from '@/lib/shareLinks'

import { pageGlobal } from './shared'

export const NewsPage = pageGlobal(
  'newsPage',
  'Новости',
  [
    { name: 'hero', label: 'Заголовок', fields: [labelField(), titleField(true)] },
    {
      name: 'articleShare',
      label: 'Статья: поделиться',
      description:
        'Кнопки «Поделиться» под текстом новости: Telegram, WhatsApp и «Скопировать ссылку» — всегда, MAX — по шаблону.',
      fields: [
        {
          name: 'maxTemplate',
          type: 'text',
          label: 'Шаблон ссылки MAX',
          admin: {
            description:
              'https://…, {url} — адрес статьи (обязательно), {text} — заголовок. Пусто — кнопки MAX нет.',
          },
          validate: (value: string | null | undefined) => checkMaxTemplate(value),
        },
      ],
    },
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
  ],
  { previewPath: '/news' },
)
