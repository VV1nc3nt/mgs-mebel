import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { contentEditors, publicRead } from '@/access'
import { PREVIEW_BREAKPOINTS, previewUrl } from '@/globals/shared'
import { checkVideoPosters, imageField, videoField } from '@/fields/media'
import { itemLabel } from '@/lib/workItems'
import { revalidateCollection } from '@/lib/revalidate'
import { workTypeOptions } from '@/lib/workTypes'
import { itemViewHref, typeFeedHref } from '@/lib/workView'

type ItemData = { title?: string | null; type?: string | null; project?: unknown }

const projectId = (value: unknown): number | string | null =>
  value && typeof value === 'object' && 'id' in value
    ? (value as { id: number | string }).id
    : typeof value === 'number' || typeof value === 'string'
      ? value
      : null

/** «Кухня — Квартира в тёплых тонах» / «Кухня в загородный дом»: the title of the admin lists. */
const setLabel: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const item = { ...(originalDoc as ItemData | undefined), ...(data as ItemData) }
  const id = projectId(item.project)
  const project = id
    ? await req.payload
        .findByID({ collection: 'projects', id, depth: 0, select: { title: true }, req })
        .catch(() => null)
    : null
  return { ...data, label: itemLabel({ title: item.title, type: item.type }, project?.title) }
}

export const Items: CollectionConfig = {
  slug: 'items',
  labels: { singular: 'Изделие', plural: 'Изделия' },
  admin: {
    group: 'Наши работы',
    useAsTitle: 'label',
    defaultColumns: ['label', 'type', 'project', 'photos', 'price', 'hidden'],
    listSearchableFields: ['label'],
    description:
      'Изделие само попадает в ленту своего типа на странице «Наши работы». Порядок — перетаскиванием в списке.',
    livePreview: {
      // The view of this item; a new one (no id yet) — the feed of its type
      url: ({ data }) =>
        previewUrl(
          data?.type && data.id
            ? itemViewHref({ type: data.type, id: data.id })
            : data?.type
              ? typeFeedHref(data.type)
              : '/works',
        ),
      breakpoints: PREVIEW_BREAKPOINTS,
    },
  },
  // Drag-and-drop order of the list (`_order`); the list must be sorted by it to drag
  orderable: true,
  defaultSort: '_order',
  access: {
    read: publicRead,
    create: contentEditors,
    update: contentEditors,
    delete: contentEditors,
  },
  hooks: {
    ...revalidateCollection('items'),
    beforeChange: [setLabel],
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      label: 'Подпись',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Считается сама: название и проект. Для списков и выбора.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'select',
          label: 'Тип',
          required: true,
          options: workTypeOptions,
          admin: { description: 'Лента на сайте: «Кухни», «Спальни»…' },
        },
        {
          name: 'title',
          type: 'text',
          label: 'Название',
          admin: { description: 'Необязательно: иначе — тип («Кухня»).' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'project',
          type: 'relationship',
          label: 'Проект',
          relationTo: 'projects',
          admin: { description: 'Пусто — отдельная работа.' },
        },
        {
          name: 'place',
          type: 'text',
          label: 'ЖК / место',
          admin: {
            condition: (_, siblingData) => !siblingData?.project,
            description: 'У отдельной работы. Необязательно.',
          },
        },
      ],
    },
    imageField('photos', {
      label: 'Фото',
      hasMany: true,
      admin: {
        isSortable: true,
        description:
          'Перетащите сразу несколько файлов. Alt для всех — «Редактировать все» → «Alt-текст» → «Применить изменения». Первое фото — обложка карточки; порядок — перетаскиванием.',
        components: {
          Label: '/components/admin/RequiredLabel#RequiredLabel',
          Cell: '/components/admin/CountCell#CountCell',
        },
      },
      extraValidate: (value) =>
        Array.isArray(value) && value.length ? true : 'Добавьте хотя бы одно фото',
    }),
    videoField('videos', {
      label: 'Видео',
      hasMany: true,
      admin: {
        isSortable: true,
        description:
          'Идут после фото и в ленту REELS. У каждого видео нужен постер (в карточке файла).',
      },
      extraValidate: (value, { req }) => checkVideoPosters(value as never, req),
    }),
    { name: 'description', type: 'textarea', label: 'Описание' },
    {
      name: 'specs',
      type: 'group',
      label: 'Характеристики',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'korpus', type: 'text', label: 'Корпус', defaultValue: 'ЛДСП Egger 18 мм' },
            { name: 'fasady', type: 'text', label: 'Фасады' },
            { name: 'furn', type: 'text', label: 'Фурнитура', defaultValue: 'Blum' },
          ],
        },
      ],
    },
    {
      name: 'extraSpecs',
      type: 'array',
      label: 'Ещё характеристики',
      labels: { singular: 'Характеристика', plural: 'Характеристики' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', label: 'Название', required: true },
            { name: 'value', type: 'text', label: 'Значение', required: true },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'price',
          type: 'number',
          label: 'Стоимость, ₽',
          min: 0,
          admin: { description: 'Необязательно.' },
        },
        {
          name: 'ctaLabel',
          type: 'text',
          label: 'Кнопка',
          admin: { description: 'Необязательно: иначе «Хочу такую же» / «Хочу такой же».' },
        },
      ],
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'На главной',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Показать первым в блоке «Наши работы».' },
    },
    {
      name: 'hidden',
      type: 'checkbox',
      label: 'Скрыть с сайта',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
  ],
}
