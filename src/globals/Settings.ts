import type { Field, GlobalConfig } from 'payload'

import { publicRead, salonEditors, technicalFieldRead, technicalFieldUpdate } from '@/access'
import { imageField } from '@/fields/media'

const messengerFields = (): Field[] => [
  {
    type: 'row',
    fields: [
      { name: 'max', type: 'text', label: 'MAX (ссылка)' },
      { name: 'whatsapp', type: 'text', label: 'WhatsApp (ссылка)' },
      { name: 'telegram', type: 'text', label: 'Telegram (ссылка)' },
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
