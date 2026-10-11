import type {
  CollectionConfig,
  NumberFieldSingleValidation,
  TextFieldSingleValidation,
} from 'payload'
import { number as validateNumber, text as validateText } from 'payload/shared'

import { publicRead, salonEditors } from '@/access'
import { imageField, videoField } from '@/fields/media'
import { openingHoursSchema } from '@/lib/jsonld'
import { revalidateCollection } from '@/lib/revalidate'

type Location = { lat?: number | null; lng?: number | null }

const isSet = (value: unknown) => typeof value === 'number' && !Number.isNaN(value)

/** Hours as people write them: the page turns them into schema.org `openingHours`. */
const hoursFormat: TextFieldSingleValidation = (value, args) => {
  const base = validateText(value, args)
  if (base !== true) return base
  return openingHoursSchema(value) ? true : 'Формат: Пн–Вс 10:00–21:00'
}

/** Latitude and longitude are filled together or not at all. */
const bothOrNone: NumberFieldSingleValidation = (value, args) => {
  const base = validateNumber(value, args)
  if (base !== true) return base
  const { lat, lng } = (args.siblingData ?? {}) as Location
  return isSet(lat) === isSet(lng) ? true : 'Укажите обе координаты: широту и долготу'
}

export const Salons: CollectionConfig = {
  slug: 'salons',
  labels: { singular: 'Салон', plural: 'Салоны' },
  admin: {
    group: 'Контент',
    useAsTitle: 'name',
    defaultColumns: ['name', 'address', 'phone', 'order'],
  },
  defaultSort: 'order',
  access: {
    read: publicRead,
    create: salonEditors,
    update: salonEditors,
    delete: salonEditors,
  },
  hooks: revalidateCollection('salons'),
  fields: [
    { name: 'name', type: 'text', label: 'Название', required: true },
    { name: 'address', type: 'text', label: 'Адрес', required: true },
    {
      type: 'row',
      fields: [
        { name: 'phone', type: 'text', label: 'Телефон' },
        { name: 'metro', type: 'text', label: 'Метро' },
        {
          name: 'hours',
          type: 'text',
          label: 'Часы работы',
          validate: hoursFormat,
          admin: {
            description:
              'Для поисковиков, на странице не выводится. Например: Пн–Вс 10:00–21:00 или Пн–Пт 10:00–21:00; Сб–Вс 11:00–20:00',
          },
        },
      ],
    },
    {
      name: 'location',
      type: 'group',
      label: 'Координаты',
      admin: {
        description:
          'Без координат салон не показывается на карте. Заполните оба поля или ни одного.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'lat',
              type: 'number',
              label: 'Широта',
              min: -90,
              max: 90,
              validate: bothOrNone,
            },
            {
              name: 'lng',
              type: 'number',
              label: 'Долгота',
              min: -180,
              max: 180,
              validate: bothOrNone,
            },
          ],
        },
      ],
    },
    // README «Салоны» §3.2: the photo is always shown first and stays when the video fails.
    imageField('poster', {
      label: 'Фото карточки',
      // Required through validate, not `required`: no NOT NULL on a column with existing rows.
      admin: {
        description: 'Обязательно. Вертикальное 3:4, WebP/AVIF, 900 px, до 200 КБ.',
        components: { Label: '/components/admin/RequiredLabel#RequiredLabel' },
      },
      extraValidate: (value) => (value ? true : 'Добавьте фото карточки'),
    }),
    videoField('reviewVideo', {
      label: 'Видео карточки',
      admin: {
        description:
          'MP4 (H.264) без звука, вертикальное 3:4 или 9:16, 6–12 с, до 2 МБ. Необязательно.',
      },
    }),
    {
      name: 'order',
      type: 'number',
      label: 'Порядок',
      admin: { position: 'sidebar', description: 'Меньше — выше.' },
    },
  ],
}
