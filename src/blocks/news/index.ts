import type { Block } from 'payload'

import { imageField, mediaField, videoField } from '@/fields/media'
import { isAllowedEmbedUrl } from '@/lib/embed'

type VideoRow = { file?: unknown; embedUrl?: string | null }

export const ParagraphBlock: Block = {
  slug: 'paragraph',
  interfaceName: 'NewsParagraphBlock',
  labels: { singular: 'Абзац', plural: 'Абзацы' },
  fields: [{ name: 'text', type: 'richText', label: 'Текст', required: true }],
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
  fields: [
    videoField('file', {
      label: 'Видеофайл',
      admin: { description: 'Файл MP4/WebM или ссылка ниже — что-то одно.' },
      extraValidate: (value, { siblingData }) => {
        const { embedUrl } = (siblingData ?? {}) as VideoRow
        if (!value && !embedUrl) return 'Загрузите видео или укажите ссылку'
        if (value && embedUrl) return 'Укажите что-то одно: файл или ссылку'
        return true
      },
    }),
    {
      name: 'embedUrl',
      type: 'text',
      label: 'Ссылка на видео',
      admin: { description: 'RuTube, VK Видео или YouTube.' },
      validate: (value: string | null | undefined) =>
        !value || isAllowedEmbedUrl(value)
          ? true
          : 'Поддерживаются только ссылки https на RuTube, VK Видео и YouTube',
    },
    imageField('poster', { label: 'Постер', required: true }),
    {
      type: 'row',
      fields: [
        {
          name: 'duration',
          type: 'text',
          label: 'Длительность',
          admin: { description: 'Например, 1:24' },
        },
        { name: 'vertical', type: 'checkbox', label: 'Вертикальное (9:16)' },
        { name: 'wide', type: 'checkbox', label: 'На всю ширину' },
      ],
    },
    { name: 'caption', type: 'text', label: 'Подпись' },
  ],
}

export const newsBlocks: Block[] = [
  ParagraphBlock,
  HeadingBlock,
  ListBlock,
  QuoteBlock,
  MediaBlock,
  VideoBlock,
]
