import type { Field, GlobalConfig } from 'payload'

import { contentEditors, publicRead } from '@/access'

const navItem = (name: string, label: string): Field => ({
  name,
  type: 'group',
  label,
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'label', type: 'text', label: 'В меню', required: true },
        {
          name: 'shortLabel',
          type: 'text',
          label: 'В шапке (desktop)',
          admin: { description: 'Если пусто — как в меню.' },
        },
      ],
    },
  ],
})

export const Layout: GlobalConfig = {
  slug: 'layout',
  label: 'Шапка, меню, подвал',
  admin: { group: 'Настройки' },
  access: { read: publicRead, update: contentEditors },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'header',
          label: 'Шапка',
          fields: [
            {
              name: 'ctaLabel',
              type: 'text',
              label: 'Кнопка',
              admin: { description: 'Например, «Рассчитать проект»' },
            },
          ],
        },
        {
          name: 'nav',
          label: 'Разделы',
          fields: [
            navItem('about', 'О нас'),
            navItem('salons', 'Фирменные салоны'),
            navItem('works', 'Наши работы'),
            navItem('catalogs', 'Каталоги'),
            navItem('designers', 'Дизайнерам'),
            navItem('news', 'Новости'),
          ],
        },
        {
          name: 'menu',
          label: 'Меню',
          fields: [
            { name: 'hotlineLabel', type: 'text', label: 'Подпись горячей линии' },
            { name: 'messengersLabel', type: 'text', label: 'Подпись над мессенджерами' },
          ],
        },
        {
          name: 'dock',
          label: 'Плавающий док',
          fields: [
            { name: 'askLabel', type: 'text', label: 'Кнопка консультанта', required: true },
          ],
        },
        {
          name: 'footer',
          label: 'Подвал',
          fields: [
            {
              name: 'sloganText',
              type: 'textarea',
              label: 'Слоган',
              admin: { description: 'Перенос строки сохраняется на сайте.', rows: 2 },
            },
            {
              name: 'sloganAccent',
              type: 'text',
              label: 'Слоган: акцент',
              admin: { description: 'Выделяется лаймовым, например «для жизни»' },
            },
            { name: 'hotlineLabel', type: 'text', label: 'Подпись горячей линии' },
            {
              name: 'copyright',
              type: 'text',
              label: 'Копирайт',
              admin: { description: '«© год» добавляется автоматически.' },
            },
          ],
        },
      ],
    },
  ],
}
