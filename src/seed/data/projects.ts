import type { RequiredDataFromCollectionSlug } from 'payload'

import { slugify } from '@/lib/slugify'
import { seoMeta } from '../seo'
import type { MediaId } from './types'

type Project = RequiredDataFromCollectionSlug<'projects'>
type Category = Project['category']

/** «Наши работы» prototype: titles, places and the description are cycled by formula. */
const TITLES = [
  'Что не нравится клиенту?',
  'Покажу за 30 секунд',
  'Про шкаф расскажет дизайнер',
  'Гардеробная Space',
  'Помощники на адресе',
  'Спальня с видом',
  'Разбираемся с косяками',
  'Квартиры, которые вдохновляют',
  'Кухня-остров',
  'Из новинок',
  'Фасады — это любовь',
  'Что разместить в шоуруме?',
]
const PLACES = [
  'ЖК «Остров»',
  'ЖК «Символ»',
  'ЖК «Level Мичуринский»',
  'ЖК «Сердце столицы»',
  'ЖК «Шагал»',
  'Химки',
]
const DESCRIPTION =
  'Комплексный проект под ключ: кухня, гардеробная и системы хранения в едином декоре. Фасады ALVIC, фурнитура MGS с доводчиками, подсветка профилем. От замера до монтажа — один менеджер и одна фабрика.'

/** Category, number of projects, offset in the prototype filter list, photo pool (no repeats within a project). */
const CATEGORIES: { category: Category; count: number; offset: number; pool: string[] }[] = [
  {
    category: 'complex',
    count: 12,
    offset: 1,
    pool: [
      'N1',
      'N5',
      'N13',
      'N11',
      'N7',
      'N3',
      'N9',
      'N14',
      'U7',
      'N2',
      'N6',
      'N18',
      'N12',
      'N8',
      'N4',
      'N10',
      'U9',
      'N15',
      'N17',
      'N16',
    ],
  },
  { category: 'kitchens', count: 3, offset: 2, pool: ['N1', 'N2', 'N3', 'N4', 'U9', 'N15', 'N16'] },
  { category: 'hallways', count: 3, offset: 3, pool: ['N7', 'N8', 'U7', 'N17', 'N6'] },
  { category: 'bedrooms', count: 3, offset: 4, pool: ['N9', 'N10', 'N5', 'N17', 'N13'] },
  { category: 'bathrooms', count: 3, offset: 5, pool: ['N11', 'N12', 'U7', 'N9', 'N8'] },
  { category: 'wardrobes', count: 3, offset: 6, pool: ['N5', 'N6', 'U7', 'N17', 'N7'] },
  { category: 'livingrooms', count: 3, offset: 7, pool: ['N13', 'N14', 'N18', 'U2', 'N8'] },
]

/** Vertical project videos and their posters. */
const VIDEOS = [
  { video: 'V1', poster: 'N1' },
  { video: 'V2', poster: 'N5' },
  { video: 'V3', poster: 'N2' },
  { video: 'V4', poster: 'N9' },
]

/** Four video projects from different categories go to the home page. */
const FEATURED = new Set<Category>(['complex', 'kitchens', 'wardrobes', 'livingrooms'])

const weeks = (n: number) => {
  const mod10 = n % 10
  const mod100 = n % 100
  const word =
    mod10 === 1 && mod100 !== 11
      ? 'неделя'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
        ? 'недели'
        : 'недель'
  return `${n} ${word}`
}

type ProjectPlan = {
  n: number
  category: Category
  title: string
  place: string
  area: number
  duration: string
  video?: (typeof VIDEOS)[number]
  photos: string[]
  featured: boolean
}

/** Deterministic plan of all demo projects (media as manifest keys). */
export const projectPlan: ProjectPlan[] = (() => {
  const plan: ProjectPlan[] = []
  let videoIndex = 0
  for (const { category, count, offset, pool } of CATEGORIES) {
    for (let i = 0; i < count; i++) {
      const hasVideo = i % 3 !== 1
      const photoCount = hasVideo ? 2 : 4 + (i % 3)
      const start = (i * 3) % pool.length
      const photos = Array.from({ length: photoCount }, (_, k) => pool[(start + k) % pool.length])
      plan.push({
        n: plan.length + 1,
        category,
        title: TITLES[(i + offset) % TITLES.length],
        // By the overall number, not the index in the category: keeps «title, place» unique.
        place: PLACES[plan.length % PLACES.length],
        area: 30 + ((i * 7) % 60),
        duration: weeks(3 + (i % 4)),
        video: hasVideo ? VIDEOS[videoIndex++ % VIDEOS.length] : undefined,
        photos,
        featured: i === 0 && FEATURED.has(category),
      })
    }
  }
  return plan
})()

export const projectSlug = ({ n, title }: Pick<ProjectPlan, 'n' | 'title'>) =>
  `${slugify(title)}-${n}`

export const projects = (id: MediaId): Project[] =>
  projectPlan.map((p) => ({
    title: p.title,
    slug: projectSlug(p),
    generateSlug: false,
    category: p.category,
    place: p.place,
    area: p.area,
    duration: p.duration,
    description: DESCRIPTION,
    slides: [
      ...(p.video
        ? [{ type: 'video' as const, file: id(p.video.video), poster: id(p.video.poster) }]
        : []),
      ...p.photos.map((key) => ({ type: 'photo' as const, file: id(key) })),
    ],
    featured: p.featured,
    order: p.n,
    meta: seoMeta({
      title: `${p.title}, ${p.place}`,
      description: DESCRIPTION,
      image: id(p.photos[0]),
    }),
  }))
