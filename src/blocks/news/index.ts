import {
  BoldFeature,
  InlineToolbarFeature,
  ItalicFeature,
  lexicalEditor,
  LinkFeature,
  ParagraphFeature,
  StrikethroughFeature,
  UnderlineFeature,
} from '@payloadcms/richtext-lexical'
import type { Block, FieldAffectingData, RichTextField } from 'payload'
import { richText as validateRichText } from 'payload/shared'

import { mediaField } from '@/fields/media'
import { videoPlayerFields } from '@/fields/videoPlayer'

type LinkFields = { linkType?: 'custom' | 'internal' }

/** External links always open in a new tab (rendered with rel="noopener noreferrer"), internal ones never. */
const newTabByLinkType = (field: FieldAffectingData): FieldAffectingData =>
  field.name === 'newTab' && field.type === 'checkbox'
    ? {
        ...field,
        admin: { ...field.admin, hidden: true },
        hooks: {
          beforeChange: [({ siblingData }) => (siblingData as LinkFields)?.linkType === 'custom'],
        },
      }
    : field

/**
 * Inline formatting only. Headings, lists, quotes and media are separate blocks:
 * a heading inside a paragraph would break the page outline (one H1, then H2/H3).
 */
const paragraphEditor = lexicalEditor({
  features: () => [
    ParagraphFeature(),
    BoldFeature(),
    ItalicFeature(),
    UnderlineFeature(),
    StrikethroughFeature(),
    InlineToolbarFeature(),
    LinkFeature({
      enabledCollections: ['news', 'projects', 'items'],
      fields: ({ defaultFields }) => defaultFields.map(newTabByLinkType),
    }),
  ],
})

/** Nodes the paragraph editor can produce. */
const INLINE_NODES = new Set(['root', 'paragraph', 'text', 'linebreak', 'tab', 'link', 'autolink'])

const findForeignNode = (node: unknown): string | undefined => {
  if (!node || typeof node !== 'object') return undefined
  const { type, children } = node as { type?: unknown; children?: unknown }
  if (typeof type === 'string' && !INLINE_NODES.has(type)) return type
  return Array.isArray(children) ? children.map(findForeignNode).find(Boolean) : undefined
}

/**
 * The editor only hides other features; data sent through the API may still contain
 * headings, lists or images. Refuse them on the server.
 */
const validateInlineOnly: RichTextField['validate'] = async (value, args) => {
  const base = await validateRichText(value, args)
  if (base !== true) return base
  const foreign = findForeignNode((value as { root?: unknown } | null)?.root)
  return foreign
    ? `В абзаце допустимо только строчное форматирование и ссылки (найдено: ${foreign}). Заголовки, списки, цитаты и фото — отдельные блоки.`
    : true
}

export const ParagraphBlock: Block = {
  slug: 'paragraph',
  interfaceName: 'NewsParagraphBlock',
  labels: { singular: 'Абзац', plural: 'Абзацы' },
  fields: [
    {
      name: 'text',
      type: 'richText',
      label: 'Текст',
      required: true,
      editor: paragraphEditor,
      validate: validateInlineOnly,
    },
  ],
}

export const HeadingBlock: Block = {
  slug: 'heading',
  interfaceName: 'NewsHeadingBlock',
  labels: { singular: 'Подзаголовок', plural: 'Подзаголовки' },
  fields: [{ name: 'text', type: 'text', label: 'Текст', required: true }],
}

export const ListBlock: Block = {
  slug: 'list',
  interfaceName: 'NewsListBlock',
  labels: { singular: 'Список', plural: 'Списки' },
  fields: [
    {
      name: 'items',
      type: 'array',
      label: 'Пункты',
      labels: { singular: 'Пункт', plural: 'Пункты' },
      required: true,
      minRows: 1,
      fields: [{ name: 'text', type: 'text', label: 'Текст', required: true }],
    },
  ],
}

export const QuoteBlock: Block = {
  slug: 'quote',
  interfaceName: 'NewsQuoteBlock',
  labels: { singular: 'Цитата', plural: 'Цитаты' },
  fields: [
    { name: 'text', type: 'textarea', label: 'Цитата', required: true },
    { name: 'author', type: 'text', label: 'Автор' },
  ],
}

export const MediaBlock: Block = {
  slug: 'media',
  interfaceName: 'NewsMediaBlock',
  labels: { singular: 'Фото', plural: 'Фото' },
  fields: [
    mediaField('photos', 'image', {
      label: 'Фотографии',
      hasMany: true,
      required: true,
      minRows: 1,
      admin: { description: '1 фото — картинка в тексте, 2 и больше — слайдер.' },
    }),
    { name: 'caption', type: 'text', label: 'Подпись' },
    {
      type: 'row',
      fields: [
        {
          name: 'ratio',
          type: 'select',
          label: 'Пропорции',
          options: [
            { label: '3:2', value: '3x2' },
            { label: '4:5', value: '4x5' },
            { label: '1:1', value: '1x1' },
            { label: '16:9', value: '16x9' },
          ],
          admin: {
            description: 'По умолчанию: одно фото — 3:2 (16:9 при «на всю ширину»), слайдер — 4:5.',
          },
        },
        { name: 'wide', type: 'checkbox', label: 'На всю ширину' },
      ],
    },
  ],
}

export const VideoBlock: Block = {
  slug: 'video',
  interfaceName: 'NewsVideoBlock',
  labels: { singular: 'Видео', plural: 'Видео' },
  fields: videoPlayerFields({
    fileName: 'file',
    rule: 'exactlyOne',
    durationRow: [
      { name: 'vertical', type: 'checkbox', label: 'Вертикальное (9:16)' },
      { name: 'wide', type: 'checkbox', label: 'На всю ширину' },
    ],
  }),
}

export const newsBlocks: Block[] = [
  ParagraphBlock,
  HeadingBlock,
  ListBlock,
  QuoteBlock,
  MediaBlock,
  VideoBlock,
]
