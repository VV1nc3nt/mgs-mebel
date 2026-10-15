import { slugField, type CollectionConfig, type TextFieldSingleValidation } from 'payload'
import { array as validateArray, text as validateText } from 'payload/shared'

import { contentEditors, publicRead } from '@/access'
import { PREVIEW_BREAKPOINTS, previewUrl } from '@/globals/shared'
import { checkMediaKind, imageField, mediaField, mimeFilter } from '@/fields/media'
import { projectCategoryOptions } from '@/lib/projectCategories'
import { revalidateCollection } from '@/lib/revalidate'
import { isSlug, slugify } from '@/lib/slugify'

type SlideRow = { type?: 'video' | 'photo' | null }

const validateSlug: TextFieldSingleValidation = (value, args) => {
  const base = validateText(value, args)
  if (base !== true) return base
  return !value || isSlug(value) ? true : 'Только латиница в нижнем регистре, цифры и дефисы'
}

export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: { singular: 'Работа', plural: 'Наши работы' },
  admin: {
    group: 'Контент',
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'place', 'featured', 'order', 'updatedAt'],
    // The project page with the viewer open; no drafts — it shows what was saved
    livePreview: {
      url: ({ data }) => previewUrl(data?.slug ? `/works/${data.slug}` : '/works'),
      breakpoints: PREVIEW_BREAKPOINTS,
    },
  },
  defaultSort: '-createdAt',
  access: {
    read: publicRead,
    create: contentEditors,
    update: contentEditors,
    delete: contentEditors,
  },
  hooks: revalidateCollection('projects'),
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
      name: 'category',
      type: 'select',
      label: 'Категория',
      required: true,
      options: [...projectCategoryOptions],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'place',
          type: 'text',
          label: 'Место',
          admin: { description: 'Например, ЖК «Остров»' },
        },
        { name: 'area', type: 'number', label: 'Площадь, м²', min: 0 },
        {
          name: 'duration',
          type: 'text',
          label: 'Срок',
          admin: { description: 'Например, 4 недели' },
        },
      ],
    },
    { name: 'description', type: 'textarea', label: 'Описание' },
    {
      name: 'slides',
      type: 'array',
      label: 'Кадры',
      labels: { singular: 'Кадр', plural: 'Кадры' },
      required: true,
      minRows: 1,
      admin: {
        description:
          'В видео-проекте первый кадр — видео, дальше фото. Видео допускается только первым.',
      },
      validate: (value, args) => {
        const base = validateArray(value, args)
        if (base !== true) return base
        const rows = (args.data as { slides?: SlideRow[] } | undefined)?.slides ?? []
        const misplaced = rows.findIndex((row, index) => index > 0 && row?.type === 'video')
        return misplaced === -1
          ? true
          : `Видео допускается только в первом кадре (кадр №${misplaced + 1})`
      },
      fields: [
        {
          name: 'type',
          type: 'select',
          label: 'Тип',
          required: true,
          defaultValue: 'photo',
          options: [
            { label: 'Фото', value: 'photo' },
            { label: 'Видео', value: 'video' },
          ],
        },
        mediaField('file', null, {
          label: 'Файл',
          required: true,
          filterOptions: ({ siblingData }) =>
            mimeFilter((siblingData as SlideRow)?.type === 'video' ? 'video' : 'image'),
          extraValidate: (value, { req, siblingData }) =>
            checkMediaKind(
              value,
              (siblingData as SlideRow)?.type === 'video' ? 'video' : 'image',
              req,
            ),
        }),
        imageField('poster', {
          label: 'Постер',
          admin: { condition: (_, siblingData) => siblingData?.type === 'video' },
          extraValidate: (value, { siblingData }) =>
            (siblingData as SlideRow)?.type === 'video' && !value
              ? 'Постер обязателен для видео'
              : true,
        }),
        {
          name: 'duration',
          type: 'number',
          label: 'Длительность, с',
          min: 0,
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'video',
            description: 'Необязательно: иначе берётся из файла.',
          },
        },
      ],
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'На главной',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Порядок',
      admin: { position: 'sidebar', description: 'Меньше — выше.' },
    },
  ],
}
