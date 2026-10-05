import type { Field, Tab } from 'payload'

import { bgVideoFields, imageField } from '@/fields/media'
import { labelField, textField, titleField } from '@/fields/section'

/*
 * Page sections shared by several page globals (README §6): one named tab per section, the same
 * name, label and fields on every page. `interfaceName` gives each section one generated type for
 * its component; a variant with an extra field gets a name of its own. Types only, no database
 * change.
 */

/** First screen (Home §6.1 п.1, About §6.2): with or without the CTA label. */
export const heroTab = ({ cta }: { cta: boolean }): Tab => ({
  name: 'hero',
  label: 'Первый экран',
  interfaceName: cta ? 'SectionHeroCta' : 'SectionHero',
  fields: [
    labelField(),
    titleField(true),
    textField(),
    ...(cta ? [{ name: 'ctaLabel', type: 'text', label: 'Кнопка' } satisfies Field] : []),
    ...bgVideoFields(),
  ],
})

/** Company history (Home §6.1 п.3, About §6.2): with or without the «Подробнее» link label. */
export const historyTab = ({ link }: { link: boolean }): Tab => ({
  name: 'history',
  label: 'История',
  interfaceName: link ? 'SectionHistoryLink' : 'SectionHistory',
  fields: [
    labelField(),
    imageField('photoMain', { label: 'Фото 3:4', required: true }),
    {
      type: 'row',
      fields: [
        {
          name: 'yearValue',
          type: 'text',
          label: 'Плашка: год',
          admin: { description: 'Например, 2001' },
        },
        { name: 'yearCaption', type: 'text', label: 'Плашка: подпись' },
      ],
    },
    imageField('photoSecondary', { label: 'Фото 1:1' }),
    { name: 'lead', type: 'textarea', label: 'Лид' },
    textField(),
    {
      name: 'values',
      type: 'array',
      label: 'Ценности (чипы)',
      labels: { singular: 'Ценность', plural: 'Ценности' },
      maxRows: 6,
      fields: [{ name: 'label', type: 'text', label: 'Текст', required: true }],
    },
    ...(link
      ? [{ name: 'linkLabel', type: 'text', label: 'Ссылка «Подробнее»' } satisfies Field]
      : []),
  ],
})

/** News slider (Home §6.1 п.4). */
export const newsTab = (): Tab => ({
  name: 'news',
  label: 'Новости',
  interfaceName: 'SectionNews',
  description: 'Слайдер показывает 3 последние опубликованные новости.',
  fields: [labelField(), titleField()],
})

/** Salons: map and card (Home §6.1 п.5). */
export const salonsTab = (): Tab => ({
  name: 'salons',
  label: 'Салоны',
  interfaceName: 'SectionSalons',
  description:
    'Карта и карточка берут данные из «Салонов»; кнопка карточки — из страницы «Салоны».',
  fields: [labelField(), titleField()],
})

/** Works preview by category (Home §6.1 п.6). */
export const worksTab = (): Tab => ({
  name: 'works',
  label: 'Наши работы',
  interfaceName: 'SectionWorks',
  description:
    'Превью — до 4 работ на категорию: сначала с отметкой «На главной», затем по порядку.',
  fields: [labelField(), titleField(), { name: 'buttonLabel', type: 'text', label: 'Кнопка' }],
})
