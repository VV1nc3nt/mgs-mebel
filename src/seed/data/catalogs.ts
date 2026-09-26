import type { RequiredDataFromCollectionSlug } from 'payload'

import { catalogPdf } from '../manifest'
import type { MediaId } from './types'

type Catalog = RequiredDataFromCollectionSlug<'catalogs'>

/** Catalogs page prototype: title, category, pages and cover photo. */
const list = [
  {
    key: 'PDF1',
    name: 'facade',
    title: 'Фрезеровки «FACADE»',
    category: 'facades',
    pages: 48,
    cover: 'U6',
  },
  {
    key: 'PDF2',
    name: 'kitchens',
    title: 'Кухни 2026',
    category: 'kitchens',
    pages: 96,
    cover: 'U4',
  },
  {
    key: 'PDF3',
    name: 'wardrobes',
    title: 'Гардеробные системы',
    category: 'wardrobes',
    pages: 64,
    cover: 'U7',
  },
  {
    key: 'PDF4',
    name: 'alvic',
    title: 'Декоры ALVIC 2026',
    category: 'facades',
    pages: 72,
    cover: 'U1',
  },
  {
    key: 'PDF5',
    name: 'bathrooms',
    title: 'Мебель для ванных',
    category: 'bathrooms',
    pages: 40,
    cover: 'U9',
  },
  {
    key: 'PDF6',
    name: 'tables',
    title: 'Столы и стулья',
    category: 'tables',
    pages: 36,
    cover: 'U8',
  },
  {
    key: 'PDF7',
    name: 'quartz',
    title: 'Столешницы и кварц',
    category: 'kitchens',
    pages: 28,
    cover: 'U3',
  },
  {
    key: 'PDF8',
    name: 'sliding-wardrobes',
    title: 'Шкафы-купе',
    category: 'wardrobes',
    pages: 52,
    cover: 'U10',
  },
] as const

export const catalogPdfs = list.map(({ key, name, title }) => catalogPdf(key, name, title))

export const catalogs = (id: MediaId): Catalog[] =>
  list.map(({ key, title, category, pages, cover }, index) => ({
    title,
    category,
    pages,
    cover: id(cover),
    pdf: id(key),
    order: index + 1,
  }))
