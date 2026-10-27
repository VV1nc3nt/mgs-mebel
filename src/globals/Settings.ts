import type { Field, GlobalConfig } from 'payload'

import {
  hasRole,
  publicRead,
  salonEditors,
  technicalFieldRead,
  technicalFieldUpdate,
} from '@/access'
import { imageField } from '@/fields/media'
import { revalidateGlobal } from '@/lib/revalidate'

const httpsUrl = (value: string | null | undefined, host?: string): string | true => {
  if (!value) return true
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return 'Ссылка должна начинаться с https://'
    if (host && url.hostname !== host) return `Ссылка должна вести на https://${host}/…`
    return true
  } catch {
    return 'Некорректная ссылка'
  }
}

/** ИНН — 10 или 12 цифр, ОГРН — 13 или 15. */
export const digits = (
  value: string | null | undefined,
  lengths: number[],
  name: string,
): string | true => {
  if (!value?.trim()) return true
  const v = value.trim()
  return /^\d+$/.test(v) && lengths.includes(v.length)
    ? true
    : `${name} — ${lengths.join(' или ')} цифр`
}

const messengerFields = (): Field[] => [
  {
    type: 'row',
    fields: [
      {
        name: 'max',
        type: 'text',
        label: 'MAX (ссылка)',
        validate: (value: string | null | undefined) => httpsUrl(value),
      },
      {
        name: 'whatsapp',
        type: 'text',
        label: 'WhatsApp (ссылка)',
        admin: { description: 'https://wa.me/79001234567' },
        validate: (value: string | null | undefined) => httpsUrl(value, 'wa.me'),
      },
      {
        name: 'telegram',
        type: 'text',
        label: 'Telegram (ссылка)',
        validate: (value: string | null | undefined) => httpsUrl(value),
      },
    ],
  },
]

export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'Контакты и настройки',
  admin: { group: 'Настройки' },
  access: { read: publicRead, update: salonEditors },
  hooks: revalidateGlobal('settings'),
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'contacts',
          label: 'Контакты',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'hotlinePhone', type: 'text', label: 'Горячая линия', required: true },
                { name: 'email', type: 'email', label: 'Email' },
              ],
            },
          ],
        },
        { name: 'messengers', label: 'Мессенджеры', fields: messengerFields() },
        {
          name: 'requisites',
          label: 'Реквизиты',
          description: 'В подвале сайта. Пустые поля не выводятся.',
          fields: [
            { name: 'company', type: 'text', label: 'Компания', admin: { description: 'ООО «…»' } },
            {
              type: 'row',
              fields: [
                {
                  name: 'inn',
                  type: 'text',
                  label: 'ИНН',
                  validate: (value: string | null | undefined) => digits(value, [10, 12], 'ИНН'),
                },
                {
                  name: 'ogrn',
                  type: 'text',
                  label: 'ОГРН',
                  validate: (value: string | null | undefined) =>
                    digits(value, [13, 15], 'ОГРН'),
                },
              ],
            },
            { name: 'legalAddress', type: 'text', label: 'Юридический адрес' },
            {
              name: 'hours',
              type: 'text',
              label: 'Часы работы',
              admin: { description: 'Рядом с горячей линией, например «Ежедневно 9:00–21:00»' },
            },
          ],
        },
        {
          name: 'designerManager',
          label: 'Менеджер для дизайнеров',
          fields: [
            imageField('photo', { label: 'Фото' }),
            {
              type: 'row',
              fields: [
                { name: 'name', type: 'text', label: 'ФИО' },
                { name: 'position', type: 'text', label: 'Должность' },
                { name: 'phone', type: 'text', label: 'Телефон' },
              ],
            },
            ...messengerFields(),
          ],
        },
        {
          name: 'technical',
          label: 'Технические',
          // Hidden from roles without read access to its only field.
          admin: {
            condition: (_data, _siblingData, { user }) => hasRole(user, 'developer', 'admin'),
          },
          fields: [
            {
              name: 'consultantWidgetCode',
              type: 'code',
              label: 'Код виджета онлайн-консультанта',
              admin: { language: 'html', description: 'Вставляется на все страницы сайта.' },
              access: { read: technicalFieldRead, update: technicalFieldUpdate },
            },
          ],
        },
      ],
    },
  ],
}
