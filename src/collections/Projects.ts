import {
  slugField,
  ValidationError,
  type CollectionAfterChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionConfig,
  type TextFieldSingleValidation,
} from 'payload'
import { text as validateText } from 'payload/shared'

import { contentEditors, publicRead } from '@/access'
import { PREVIEW_BREAKPOINTS, previewUrl } from '@/globals/shared'
import { checkVideoPosters, imageField, videoField } from '@/fields/media'
import { revalidateCollection } from '@/lib/revalidate'
import { isSlug, slugify } from '@/lib/slugify'

const validateSlug: TextFieldSingleValidation = (value, args) => {
  const base = validateText(value, args)
  if (base !== true) return base
  return !value || isSlug(value) ? true : 'Только латиница в нижнем регистре, цифры и дефисы'
}

/** A project with items cannot go: the items would lose their address silently. */
const keepProjectWithItems: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { totalDocs } = await req.payload.count({
    collection: 'items',
    where: { project: { equals: id } },
    req,
  })
  if (totalDocs) {
    throw new ValidationError({
      collection: 'projects',
      errors: [
        {
          path: 'items',
          message: `У проекта ${totalDocs} изд. Сначала удалите изделия или уберите у них проект.`,
        },
      ],
    })
  }
}

/** Item captions in the admin carry the project title: refreshed when it changes. */
const refreshItemLabels: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (operation !== 'update' || doc.title === previousDoc?.title) return doc
  await req.payload.update({
    collection: 'items',
    where: { project: { equals: doc.id } },
    data: {},
    depth: 0,
    req,
  })
  return doc
}

const revalidate = revalidateCollection('projects')

export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: { singular: 'Проект', plural: 'Проекты' },
  admin: {
    group: 'Наши работы',
    useAsTitle: 'title',
    defaultColumns: ['title', 'place', 'complex', 'items', 'hidden'],
    description:
      'Проект — адрес: всё, что в нём сделано, — его изделия. Порядок на сайте — перетаскиванием в списке.',
    // «Комплекс» — the default feed of /works; the project page comes later
    livePreview: { url: () => previewUrl('/works'), breakpoints: PREVIEW_BREAKPOINTS },
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
    ...revalidate,
    afterChange: [...(revalidate?.afterChange ?? []), refreshItemLabels],
    beforeDelete: [keepProjectWithItems],
  },
  fields: [
    { name: 'title', type: 'text', label: 'Название', required: true },
    slugField({
      useAsSlug: 'title',
      slugify: ({ valueToSlugify }) => slugify(String(valueToSlugify ?? '')),
      // The project page answers only well-formed slugs: a hand-typed «_», capital or Cyrillic
      // letter would leave a card that leads to 404
      overrides: (row) => {
        for (const field of row.fields) {
          if ('name' in field && field.name === 'slug' && field.type === 'text' && !field.hasMany) {
            field.validate = validateSlug
          }
        }
        return row
      },
    }),
    {
      type: 'row',
      fields: [
        {
          name: 'place',
          type: 'text',
          label: 'ЖК / место',
          admin: { description: 'На карточке: «ЖК Уно»' },
        },
        { name: 'city', type: 'text', label: 'Город', defaultValue: 'Москва' },
        { name: 'year', type: 'number', label: 'Год', min: 1990, max: 2100 },
      ],
    },
    {
      name: 'complex',
      type: 'checkbox',
      label: 'Комплекс — своя страница',
      defaultValue: false,
      admin: {
        description:
          'Проект на всю квартиру: карточка в ленте «Комплекс» и своя страница. В ленте — только если есть видимые изделия.',
      },
    },
    {
      name: 'items',
      type: 'join',
      label: 'Изделия проекта',
      collection: 'items',
      on: 'project',
      // The editor's order of the items list
      defaultSort: '_order',
      admin: {
        defaultColumns: ['label', 'type', 'photos', 'price', 'hidden'],
        components: { Cell: '/components/admin/CountCell#CountCell' },
        description:
          'Каждое изделие само попадает в ленту своего типа. «Добавить» доступно после первого сохранения проекта.',
      },
    },
    imageField('cover', {
      label: 'Обложка',
      admin: { description: 'Необязательно: иначе — первое фото первого изделия.' },
    }),
    {
      name: 'about',
      type: 'textarea',
      label: 'О проекте',
      admin: { description: 'Блок «О проекте» на странице проекта.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'price',
          type: 'number',
          label: 'Стоимость проекта, ₽',
          min: 0,
          admin: { description: 'Необязательно.' },
        },
        {
          name: 'designer',
          type: 'text',
          label: 'Дизайнер проекта',
          admin: { description: 'Имя. Необязательно.' },
        },
      ],
    },
    videoField('videos', {
      label: 'Видео проекта',
      hasMany: true,
      admin: {
        isSortable: true,
        description:
          'Ролики всей квартиры, не одного изделия: идут в ленту REELS. У каждого видео нужен постер (в карточке файла).',
      },
      extraValidate: (value, { req }) => checkVideoPosters(value as never, req),
    }),
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
      admin: { position: 'sidebar', description: 'Скрывает и все изделия и видео проекта.' },
    },
  ],
}
