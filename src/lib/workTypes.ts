/**
 * Item types of «Наши работы» and the feeds of the works page: the select of «Изделия», the chips
 * of /works and of the home section share these lists. Kept free of Payload imports, so client
 * components and unit tests can use them.
 */
export const workTypes = [
  { value: 'kitchens', label: 'Кухня', plural: 'Кухни', feminine: true },
  { value: 'livingrooms', label: 'Гостиная', plural: 'Гостиные', feminine: true },
  { value: 'bathrooms', label: 'Санузел', plural: 'Санузлы', feminine: false },
  { value: 'hallways', label: 'Прихожая', plural: 'Прихожие', feminine: true },
  { value: 'wardrobes', label: 'Гардеробная', plural: 'Гардеробные', feminine: true },
  { value: 'bedrooms', label: 'Спальня', plural: 'Спальни', feminine: true },
  { value: 'kids', label: 'Детская', plural: 'Детские', feminine: true },
] as const

export type WorkType = (typeof workTypes)[number]['value']

/** Options of the «Тип» select: singular labels. */
export const workTypeOptions = workTypes.map(({ value, label }) => ({ value, label }))

const typeOf = (value: string | null | undefined) => workTypes.find((t) => t.value === value)

/** «Кухня»; undefined for an unknown value. */
export const workTypeLabel = (value: string | null | undefined): string | undefined =>
  typeOf(value)?.label

/** Default CTA of an item: «Хочу такую же» / «Хочу такой же» by the type's gender. */
export const workTypeCta = (value: string | null | undefined): string =>
  typeOf(value)?.feminine === false ? 'Хочу такой же' : 'Хочу такую же'

/** Videos of projects and items: a feed, not a type. */
export const REELS = 'reels'
/** Projects marked «Комплекс»: the default feed. */
export const COMPLEX = 'complex'

export type WorkFeed = typeof REELS | typeof COMPLEX | WorkType

/** Feeds in the chip order of the design: REELS, Комплекс, then the types. */
export const WORK_FEEDS: readonly { value: WorkFeed; label: string }[] = [
  { value: REELS, label: 'REELS' },
  { value: COMPLEX, label: 'Комплекс' },
  ...(
    ['kitchens', 'bedrooms', 'wardrobes', 'hallways', 'bathrooms', 'kids', 'livingrooms'] as const
  )
    .map((value) => typeOf(value)!)
    .map(({ value, plural }) => ({ value, label: plural })),
]

export const WORK_FEED_VALUES: readonly WorkFeed[] = WORK_FEEDS.map(({ value }) => value)

/** The feed of an item type: the type itself. */
export const isWorkType = (value: unknown): value is WorkType =>
  typeof value === 'string' && workTypes.some((t) => t.value === value)
