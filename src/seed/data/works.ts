import type { RequiredDataFromCollectionSlug, Where } from 'payload'

import { slugify } from '@/lib/slugify'
import type { WorkType } from '@/lib/workTypes'
import { seoMeta } from '../seo'
import { complexProjects, separateItems, type ItemPlan } from './portfolio'
import type { MediaId } from './types'

type ProjectData = RequiredDataFromCollectionSlug<'projects'>
type ItemData = RequiredDataFromCollectionSlug<'items'>

/**
 * Stock photos per item type, no repeats within an item. Items take as many photos as the
 * reference has, or the whole pool when it is smaller (hallways 2, bedrooms and kids 4,
 * bathrooms 5); the next item of the type starts where the previous one stopped.
 */
const POOLS: Record<WorkType, string[]> = {
  kitchens: ['N1', 'N2', 'N3', 'N4', 'N15', 'N16', 'U3', 'U4', 'U9', 'P1', 'P4'],
  livingrooms: ['N13', 'N14', 'N18', 'U1', 'U2', 'U5', 'U10', 'P3', 'P6'],
  bathrooms: ['N11', 'N12', 'N19', 'N20', 'N21'],
  hallways: ['N7', 'N8'],
  wardrobes: ['N5', 'N6', 'N17', 'P5', 'U7'],
  bedrooms: ['N9', 'N10', 'N22', 'N23'],
  // No stock of a nursery: the bedroom shots, as the works package does
  kids: ['N23', 'N22', 'N10', 'N9'],
}

/** Videos of the whole flat and of the items, in turn (each with its poster in the manifest). */
const PROJECT_VIDEOS = ['V1']
const ITEM_VIDEOS = ['V2', 'V5', 'V3', 'V4']

/** Projects of the earlier demo (category model): removed by the seed. */
export const RETIRED_PROJECTS = [
  'pokazhu-za-30-sekund-1',
  'pro-shkaf-rasskazhet-dizayner-2',
  'garderobnaya-space-3',
  'pomoshchniki-na-adrese-4',
  'spalnya-s-vidom-5',
  'razbiraemsya-s-kosyakami-6',
  'kvartiry-kotorye-vdokhnovlyayut-7',
  'kukhnya-ostrov-8',
  'iz-novinok-9',
  'fasady-eto-lyubov-10',
  'chto-razmestit-v-shourume-11',
  'chto-ne-nravitsya-klientu-12',
  'pro-shkaf-rasskazhet-dizayner-13',
  'garderobnaya-space-14',
  'pomoshchniki-na-adrese-15',
  'garderobnaya-space-16',
  'pomoshchniki-na-adrese-17',
  'spalnya-s-vidom-18',
  'pomoshchniki-na-adrese-19',
  'spalnya-s-vidom-20',
  'razbiraemsya-s-kosyakami-21',
  'spalnya-s-vidom-22',
  'razbiraemsya-s-kosyakami-23',
  'kvartiry-kotorye-vdokhnovlyayut-24',
  'razbiraemsya-s-kosyakami-25',
  'kvartiry-kotorye-vdokhnovlyayut-26',
  'kukhnya-ostrov-27',
  'kvartiry-kotorye-vdokhnovlyayut-28',
  'kukhnya-ostrov-29',
  'iz-novinok-30',
]

export type ItemSeed = {
  plan: ItemPlan
  /** Project title; null — a separate work. */
  project: string | null
  photos: string[]
  videos: string[]
}

/** Deterministic plan of every item with its media (manifest keys), in the editor's order. */
export const itemPlan: ItemSeed[] = (() => {
  const next: Partial<Record<WorkType, number>> = {}
  let video = 0
  const take = (plan: ItemPlan, project: string | null): ItemSeed => {
    const pool = POOLS[plan.type]
    const start = next[plan.type] ?? 0
    const count = Math.min(plan.photos, pool.length)
    next[plan.type] = start + count
    return {
      plan,
      project,
      photos: Array.from({ length: count }, (_, k) => pool[(start + k) % pool.length]!),
      videos: Array.from(
        { length: plan.videos ?? 0 },
        () => ITEM_VIDEOS[video++ % ITEM_VIDEOS.length]!,
      ),
    }
  }
  return [
    ...complexProjects.flatMap((p) => p.items.map((item) => take(item, p.title))),
    ...separateItems.map((item) => take(item, null)),
  ]
})()

export const projectSlug = (title: string) => slugify(title)

const firstPhoto = (title: string) => itemPlan.find((i) => i.project === title)?.photos[0]

export const workProjects = (id: MediaId): ProjectData[] => {
  let video = 0
  return complexProjects.map((p) => {
    const cover = firstPhoto(p.title)
    return {
      title: p.title,
      slug: projectSlug(p.title),
      generateSlug: false,
      place: p.place,
      city: 'Москва',
      year: null,
      complex: true,
      cover: null,
      about: p.about ?? null,
      price: p.price ?? null,
      designer: null,
      videos: Array.from({ length: p.videos ?? 0 }, () =>
        id(PROJECT_VIDEOS[video++ % PROJECT_VIDEOS.length]!),
      ),
      featured: false,
      hidden: false,
      meta: seoMeta({ title: p.title, image: cover ? id(cover) : undefined }),
    }
  })
}

/** Items with the ids of their projects (`projectIds` by title). */
export const workItems = (id: MediaId, projectIds: Map<string, number>): ItemData[] =>
  itemPlan.map(({ plan, project, photos, videos }) => ({
    type: plan.type,
    title: plan.title,
    project: project ? (projectIds.get(project) ?? null) : null,
    place: null,
    photos: photos.map(id),
    videos: videos.map(id),
    description: plan.text,
    specs: plan.specs,
    extraSpecs: [],
    price: plan.price,
    ctaLabel: null,
    featured: false,
    hidden: false,
  }))

/** How the seed finds an item again: type, title (or none) and project (or none). */
export const itemWhere = (item: Pick<ItemData, 'type' | 'title' | 'project'>): Where => ({
  and: [
    { type: { equals: item.type } },
    item.title ? { title: { equals: item.title } } : { title: { exists: false } },
    item.project ? { project: { equals: item.project } } : { project: { exists: false } },
  ],
})
