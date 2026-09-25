import type { Field, GlobalConfig } from 'payload'

import {
  hasRole,
  publicRead,
  salonEditors,
  technicalFieldRead,
  technicalFieldUpdate,
} from '@/access'
import { imageField } from '@/fields/media'

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
