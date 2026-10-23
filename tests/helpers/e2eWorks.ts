import type { WorkType } from '../../src/lib/workTypes'

/**
 * «Наши работы» of the e2e fixture: complex projects with items, separate works, hidden ones and
 * a project with no items. Photos — the generated ones by `ratio` (seedHome): `tall` 3:4, `wide`
 * 4:3, `square` 1:1, so the masonry has columns of different heights.
 */
export type E2EPhoto = 'tall' | 'wide' | 'square'

export type E2EItem = {
  type: WorkType
  title?: string
  photos: E2EPhoto[]
  /** Videos (the fixture mp4 with a poster). */
  videos?: number
  hidden?: boolean
  featured?: boolean
  /** Panel of the view: description, specs (korpus and furn — the defaults), price, CTA. */
  description?: string
  fasady?: string
  extraSpecs?: { label: string; value: string }[]
  price?: number
  ctaLabel?: string
}

export type E2EProject = {
  title: string
  slug: string
  place: string
  complex: boolean
  hidden?: boolean
  /** Videos of the whole flat. */
  videos?: number
  /** «О проекте» of its page. */
  about?: string
  price?: number
  designer?: string
  city?: string
  year?: number
  items: E2EItem[]
}

export const E2E_WORK_PROJECTS: E2EProject[] = [
  {
    title: 'Квартира в тёплых тонах',
    slug: 'kvartira-v-teplykh-tonakh',
    place: 'ЖК Уно',
    complex: true,
    videos: 1,
    about:
      'Мебель для всей квартиры в одном стиле: тёплый дуб и матовые светлые фасады.\n\nШкафы до потолка и встроенная подсветка.',
    price: 2300000,
    designer: 'Кирилл',
    city: 'Москва',
    year: 2025,
    items: [
      {
        type: 'kitchens',
        photos: ['tall', 'wide', 'square'],
        description: 'Угловая кухня до потолка: верхний ярус в дубе.\n\nРабочая зона с подсветкой.',
        fasady: 'Матовые светлые + дуб',
        extraSpecs: [{ label: 'Столешница', value: 'Кварц' }],
        price: 950000,
      },
      { type: 'hallways', photos: ['tall', 'tall'] },
      { type: 'wardrobes', photos: ['wide', 'tall'], videos: 1 },
      { type: 'bathrooms', photos: ['square', 'tall'], videos: 1, price: 320000 },
    ],
  },
  {
    title: 'Квартира в светлом беже',
    slug: 'kvartira-v-svetlom-bezhe',
    place: 'ЖК Символ',
    complex: true,
    items: [
      { type: 'kitchens', photos: ['wide', 'tall'] },
      { type: 'bedrooms', photos: ['tall', 'square'] },
    ],
  },
  {
    title: 'Квартира в белом и дубе',
    slug: 'kvartira-v-belom-i-dube',
    place: 'ЖК Домашний',
    complex: true,
    items: [
      { type: 'kids', photos: ['square', 'wide'] },
      { type: 'livingrooms', title: 'Кабинет', photos: ['tall'] },
    ],
  },
  {
    title: 'Квартира с перегородками',
    slug: 'kvartira-s-peregorodkami',
    place: 'ЖК Люблинский Парк',
    complex: true,
    items: [
      { type: 'livingrooms', photos: ['wide', 'wide'] },
      { type: 'bedrooms', photos: ['tall'] },
    ],
  },
  {
    // The project page: its videos among the frames at 0, 6, 12 and the fourth at the end
    // (13 frames); no «О проекте»
    title: 'Квартира с роликами',
    slug: 'kvartira-s-rolikami',
    place: 'ЖК Остров',
    complex: true,
    videos: 4,
    items: [
      { type: 'kitchens', title: 'Кухня с островом', photos: ['tall', 'wide', 'square', 'tall'] },
      {
        type: 'bedrooms',
        title: 'Спальня с изголовьем',
        photos: ['wide', 'tall', 'square', 'tall'],
      },
      {
        type: 'bathrooms',
        title: 'Санузел с нишей',
        photos: ['square', 'tall', 'wide', 'tall', 'square'],
      },
    ],
  },
  {
    // Not complex: its address leads to the view of its first visible item (308)
    title: 'Прихожая на Арбате',
    slug: 'prikhozhaya-na-arbate',
    place: 'Арбат',
    complex: false,
    items: [
      { type: 'hallways', title: 'Скрытая прихожая', photos: ['tall'], hidden: true },
      { type: 'hallways', title: 'Прихожая до потолка', photos: ['tall', 'wide'] },
    ],
  },
  {
    // Hidden: neither the project nor its items are on the site
    title: 'Скрытая квартира',
    slug: 'skrytaya-kvartira',
    place: 'ЖК Тайный',
    complex: true,
    hidden: true,
    items: [{ type: 'kitchens', title: 'Кухня скрытого проекта', photos: ['tall'] }],
  },
  {
    // A complex project with no items: not in «Комплекс»
    title: 'Пустой комплекс',
    slug: 'pustoy-kompleks',
    place: 'ЖК Пустой',
    complex: true,
    items: [],
  },
]

/** Works without a project. */
export const E2E_SEPARATE_ITEMS: E2EItem[] = [
  {
    type: 'kitchens',
    title: 'Кухня в загородный дом',
    photos: ['wide', 'tall', 'square'],
    price: 1250000,
    ctaLabel: 'Рассчитать такую кухню',
  },
  { type: 'kitchens', title: 'Угловая кухня под потолок', photos: ['tall', 'wide'] },
  { type: 'kitchens', title: 'Скрытая кухня', photos: ['tall'], hidden: true },
  { type: 'bathrooms', title: 'Санузел в терраццо', photos: ['square', 'square'] },
]

/** Expected tiles of a type feed: titles in the editor's order. */
export const e2eFeedTitles = (type: WorkType): string[] => [
  ...E2E_WORK_PROJECTS.filter((p) => !p.hidden).flatMap((p) =>
    p.items.filter((i) => i.type === type && !i.hidden).map((i) => i.title ?? typeLabel(type)),
  ),
  ...E2E_SEPARATE_ITEMS.filter((i) => i.type === type && !i.hidden).map((i) => i.title!),
]

const TYPE_LABELS: Record<WorkType, string> = {
  kitchens: 'Кухня',
  livingrooms: 'Гостиная',
  bathrooms: 'Санузел',
  hallways: 'Прихожая',
  wardrobes: 'Гардеробная',
  bedrooms: 'Спальня',
  kids: 'Детская',
}
const typeLabel = (type: WorkType) => TYPE_LABELS[type]

/** «Комплекс»: visible complex projects with visible items, in order. */
export const E2E_COMPLEX = E2E_WORK_PROJECTS.filter(
  (p) => p.complex && !p.hidden && p.items.some((i) => !i.hidden),
)

/** REELS: per project its videos, then its items' videos; then separate works. */
export const E2E_REELS_COUNT =
  E2E_WORK_PROJECTS.filter((p) => !p.hidden).reduce(
    (n, p) =>
      n + (p.videos ?? 0) + p.items.reduce((m, i) => m + (i.hidden ? 0 : (i.videos ?? 0)), 0),
    0,
  ) + E2E_SEPARATE_ITEMS.reduce((n, i) => n + (i.hidden ? 0 : (i.videos ?? 0)), 0)

/** Chip numbers by feed. */
export const E2E_WORK_COUNTS = {
  reels: E2E_REELS_COUNT,
  complex: E2E_COMPLEX.length,
  kitchens: e2eFeedTitles('kitchens').length,
  bedrooms: e2eFeedTitles('bedrooms').length,
  wardrobes: e2eFeedTitles('wardrobes').length,
  hallways: e2eFeedTitles('hallways').length,
  bathrooms: e2eFeedTitles('bathrooms').length,
  kids: e2eFeedTitles('kids').length,
  livingrooms: e2eFeedTitles('livingrooms').length,
} as const

/** Item of the fixture by its type and title (no title — the first one of the type). */
export const e2eItem = (type: WorkType, title?: string): E2EItem =>
  [...E2E_WORK_PROJECTS.flatMap((p) => p.items), ...E2E_SEPARATE_ITEMS].find(
    (i) => i.type === type && i.title === title,
  )!

/** Project of the fixture by its slug. */
export const e2eProject = (slug: string): E2EProject =>
  E2E_WORK_PROJECTS.find((p) => p.slug === slug)!

/** Title of the `worksPage` heading draft in the draft-mode check. */
export const WORKS_DRAFT_TITLE = 'Черновик наших работ'
