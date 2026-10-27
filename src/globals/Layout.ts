import type { Field, GlobalConfig } from 'payload'

import { contentEditors, publicRead } from '@/access'
import { checkFooterHref } from '@/lib/footer'
import { revalidateGlobal } from '@/lib/revalidate'

const REQUIRED_LABEL = { Label: '/components/admin/RequiredLabel#RequiredLabel' }

// Required through validate with a default, not `required`: the row of the global already exists
const filled = (value: string | null | undefined): string | true =>
  value?.trim() ? true : 'Заполните поле'

/** A text of the cookie notice: without it the notice is not shown at all. */
const cookieText = (name: string, label: string, defaultValue: string): Field => ({
  name,
  type: 'text',
  label,
  defaultValue,
  validate: filled,
  admin: { components: REQUIRED_LABEL },
})

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
  hooks: revalidateGlobal('layout'),
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
              admin: {
                description:
                  '«© год» добавляется автоматически. Если в «Контактах и настройках» заполнены реквизиты — вместо копирайта выводятся они.',
              },
            },
            {
              type: 'row',
              fields: [
                { name: 'menuTitle', type: 'text', label: 'Колонка: меню' },
                { name: 'buyersTitle', type: 'text', label: 'Колонка: покупателям' },
                { name: 'salonsTitle', type: 'text', label: 'Колонка: салоны' },
                { name: 'contactsTitle', type: 'text', label: 'Колонка: контакты' },
              ],
            },
            {
              name: 'contact',
              type: 'group',
              label: 'Блок связи',
              admin: { description: 'Без подписи кнопки или мессенджеров кнопки нет.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'title', type: 'text', label: 'Заголовок' },
                    { name: 'buttonLabel', type: 'text', label: 'Кнопка' },
                  ],
                },
              ],
            },
            {
              name: 'buyerLinks',
              type: 'array',
              label: 'Покупателям: ссылки',
              labels: { singular: 'Ссылка', plural: 'Ссылки' },
              admin: { description: 'Нет ссылок — колонки нет.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'label', type: 'text', label: 'Подпись', required: true },
                    {
                      name: 'href',
                      type: 'text',
                      label: 'Ссылка',
                      required: true,
                      admin: { description: 'Страница сайта «/salons» или https://…' },
                      validate: (value: string | null | undefined) =>
                        value ? checkFooterHref(value) : 'Заполните поле',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'cookies',
          label: 'Cookies',
          description:
            'Плашка согласия на cookies. «Подробнее» ведёт на опубликованную политику cookies, без неё подписи нет.',
          fields: [
            cookieText('lead', 'Текст: выделено', 'Мы используем cookies'),
            cookieText('text', 'Текст', '— чтобы сайт работал корректно и становился лучше.'),
            { name: 'moreLabel', type: 'text', label: 'Ссылка «Подробнее»' },
            {
              type: 'row',
              fields: [
                cookieText('rejectLabel', 'Кнопка: отказаться', 'Отказаться'),
                cookieText('necessaryLabel', 'Кнопка: только необходимые', 'Только необходимые'),
                cookieText('acceptLabel', 'Кнопка: принять все', 'Принять все'),
              ],
            },
          ],
        },
      ],
    },
  ],
}
