import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { Media } from '@/payload-types'

import { cleanup, createImage, createVideo, getTestPayload, PREFIX } from './helpers'

// Outside a Next request: no request scope for connection(), no incremental cache; the cache
// hooks call revalidateTag — a spy here.
const revalidateTag = vi.hoisted(() => vi.fn())
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/headers', () => ({ draftMode: async () => ({ isEnabled: false }) }))
vi.mock('next/cache', () => ({
  revalidateTag,
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

const { getProjectIndex, getWorkFeeds, getWorkItem, getWorkProject } = await import('@/lib/queries')
const { GET: getItemRoute } = await import('@/app/work-items/[id]/route')

let payload: Payload
let image: Media
let video: Media
let counter = 0

const errorMessages = async (attempt: Promise<unknown>): Promise<string> => {
  const error = await attempt.then(
    () => null,
    (e: { data?: { errors?: { message: string }[] } }) => e,
  )
  expect(error).not.toBeNull()
  return (error?.data?.errors ?? []).map((e) => e.message).join('; ')
}

const createProject = (title: string, data: Record<string, unknown> = {}) =>
  payload.create({
    collection: 'projects',
    data: { title: `${PREFIX} ${title}`, slug: `${PREFIX}-p-${++counter}`, ...data },
    depth: 0,
  })

const createItem = (data: Record<string, unknown>) =>
  payload.create({
    collection: 'items',
    // The title carries the prefix (cleanup finds items by their caption)
    data: {
      type: 'kitchens',
      title: `${PREFIX} изделие ${++counter}`,
      photos: [image.id],
      ...data,
    } as never,
    depth: 0,
  })

beforeAll(async () => {
  payload = await getTestPayload()
  image = await createImage(payload)
  video = await createVideo(payload, undefined, image.id)
})

afterAll(async () => {
  await cleanup(payload)
})

describe('projects and items: schema', () => {
  it('an item of a project is named «<title or type> — <project>», a separate one by itself', async () => {
    const project = await createProject('Квартира в тёплых тонах')
    const kitchen = await createItem({ project: project.id, title: null })
    expect(kitchen.label).toBe(`Кухня — ${PREFIX} Квартира в тёплых тонах`)
    const separate = await createItem({ title: `${PREFIX} Кухня в загородный дом` })
    expect(separate.label).toBe(`${PREFIX} Кухня в загородный дом`)

    // A renamed project renames the captions of its items
    await payload.update({
      collection: 'projects',
      id: project.id,
      data: { title: `${PREFIX} Квартира в беже` },
    })
    const renamed = await payload.findByID({ collection: 'items', id: kitchen.id, depth: 0 })
    expect(renamed.label).toBe(`Кухня — ${PREFIX} Квартира в беже`)
  })

  it('a project lists its items (join), in the editor’s order', async () => {
    const project = await createProject('с изделиями')
    const first = await createItem({ project: project.id, type: 'hallways' })
    const second = await createItem({ project: project.id, type: 'bathrooms' })
    const doc = await payload.findByID({ collection: 'projects', id: project.id, depth: 0 })
    expect(doc.items?.docs?.map((d) => (typeof d === 'object' ? d.id : d))).toEqual([
      first.id,
      second.id,
    ])
  })

  it('new documents go to the end of the order (`_order`)', async () => {
    const a = await createItem({ title: `${PREFIX} a` })
    const b = await createItem({ title: `${PREFIX} b` })
    expect(String(a._order) < String(b._order)).toBe(true)
  })
})

describe('projects and items: validation', () => {
  it('an item needs a photo', async () => {
    const message = await errorMessages(createItem({ photos: [] }))
    expect(message).toContain('Добавьте хотя бы одно фото')
  })

  it('an item photo is an image, a video is a video', async () => {
    await expect(createItem({ photos: [video.id] })).rejects.toThrow()
    await expect(createItem({ videos: [image.id] })).rejects.toThrow()
  })

  it('a video of an item or a project needs a poster', async () => {
    const bare = await createVideo(payload)
    expect(await errorMessages(createItem({ videos: [bare.id] }))).toContain('нет постера')
    expect(await errorMessages(createProject('видео', { videos: [bare.id] }))).toContain(
      'нет постера',
    )
    await expect(createItem({ videos: [video.id] })).resolves.toBeTruthy()
  })

  it('a project slug: lowercase Latin, digits and hyphens (checked on edit)', async () => {
    const project = await createProject('slug')
    await expect(
      payload.update({ collection: 'projects', id: project.id, data: { slug: 'Bad_Slug' } }),
    ).rejects.toThrow()
  })

  it('a project with items cannot be deleted; without them it can', async () => {
    const project = await createProject('удаление')
    const item = await createItem({ project: project.id })
    const message = await errorMessages(payload.delete({ collection: 'projects', id: project.id }))
    expect(message).toContain('Сначала удалите изделия или уберите у них проект')
    await payload.update({ collection: 'items', id: item.id, data: { project: null } })
    await expect(payload.delete({ collection: 'projects', id: project.id })).resolves.toBeTruthy()
  })

  it('an image used as a video poster cannot be deleted', async () => {
    const poster = await createImage(payload)
    const withPoster = await createVideo(payload, undefined, poster.id)
    const message = await errorMessages(payload.delete({ collection: 'media', id: poster.id }))
    expect(message).toContain(`Медиа: «${withPoster.filename}»`)
  })

  it('an image keeps no poster', async () => {
    const other = await createImage(payload)
    const doc = await payload.update({
      collection: 'media',
      id: other.id,
      data: { poster: image.id },
    })
    expect(doc.poster ?? null).toBeNull()
  })
})

describe('works feeds', () => {
  it('hide hidden projects with their items and videos, hidden items, and empty complexes', async () => {
    const shown = await createProject('показан', { complex: true, videos: [video.id] })
    await createItem({ project: shown.id, type: 'kids', title: `${PREFIX} детская` })
    await createItem({ project: shown.id, type: 'kids', title: `${PREFIX} скрытая`, hidden: true })
    const hidden = await createProject('скрыт', { complex: true, hidden: true, videos: [video.id] })
    await createItem({ project: hidden.id, type: 'kids', title: `${PREFIX} в скрытом` })
    await createProject('пустой комплекс', { complex: true })
    await createItem({ project: null, type: 'kids', title: `${PREFIX} отдельная` })

    const feeds = await getWorkFeeds()
    const ours = (titles: string[]) => titles.filter((t) => t.startsWith(PREFIX))
    expect(ours(feeds.kids.map((t) => ('title' in t ? t.title : '')))).toEqual([
      `${PREFIX} детская`,
      `${PREFIX} отдельная`,
    ])
    expect(ours(feeds.complex.map((t) => ('title' in t ? t.title : '')))).toEqual([
      `${PREFIX} показан`,
    ])
    expect(feeds.reels.filter((t) => t.title === `${PREFIX} показан`)).toHaveLength(1)
    expect(feeds.reels.filter((t) => t.title === `${PREFIX} скрыт`)).toHaveLength(0)
    const tile = feeds.complex.find((t) => t.title === `${PREFIX} показан`)!
    expect(tile).toMatchObject({ kind: 'project', photos: 1, videos: 1 })
  })

  it('leave out a video whose poster was removed after the item was saved', async () => {
    const own = await createVideo(payload, undefined, image.id)
    await createItem({ type: 'kids', title: `${PREFIX} без постера`, videos: [own.id] })
    await payload.update({ collection: 'media', id: own.id, data: { poster: null } })
    const feeds = await getWorkFeeds()
    expect(feeds.reels.some((t) => t.title === `${PREFIX} без постера`)).toBe(false)
    const tile = feeds.kids.find((t) => t.title === `${PREFIX} без постера`)!
    expect(tile).toMatchObject({ kind: 'item', photos: 1, videos: 0 })
  })
})

describe('view of an item', () => {
  const route = (id: string) =>
    getItemRoute(new Request(`http://localhost/work-items/${id}`), {
      params: Promise.resolve({ id }),
    })

  it('reads the panel and the frames of a visible item; its project gives «Весь проект»', async () => {
    const project = await createProject('Комплекс', { complex: true })
    const kitchen = await createItem({
      project: project.id,
      title: null,
      type: 'bathrooms',
      photos: [image.id],
      videos: [video.id],
      description: 'Первый.\n\nВторой.',
      specs: { korpus: 'ЛДСП', fasady: '', furn: 'Blum' },
      extraSpecs: [{ label: 'Столешница', value: 'Кварц' }],
      price: 125000,
      ctaLabel: null,
    })
    const item = await getWorkItem(kitchen.id)
    expect(item).toMatchObject({
      id: kitchen.id,
      type: 'bathrooms',
      title: 'Санузел',
      text: ['Первый.', 'Второй.'],
      specs: [
        { label: 'Корпус', value: 'ЛДСП' },
        { label: 'Фурнитура', value: 'Blum' },
        { label: 'Столешница', value: 'Кварц' },
      ],
      price: '125\u00a0000\u00a0₽',
      cta: 'Хочу такой же',
      project: { slug: project.slug, title: project.title },
    })
    expect(item!.frames.map((f) => [f.kind, f.image.id])).toEqual([
      ['photo', image.id],
      ['video', image.id],
    ])
    // Sizes for the full screen; only the selected fields of the media and the project
    expect(item!.frames[0]!.image.sizes?.hero).toBeDefined()
    expect(item!.frames[1]!.video).toEqual({ src: video.url, type: 'video/mp4' })
    expect(Object.keys(item!).sort()).toEqual(
      ['cta', 'frames', 'id', 'price', 'project', 'specs', 'text', 'title', 'type'].sort(),
    )

    const response = await route(String(kitchen.id))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toMatchObject({ id: kitchen.id, title: 'Санузел' })
  })

  it('not complex — no «Весь проект»; hidden item, hidden project, no such item — nothing', async () => {
    const plain = await createProject('Не комплекс', { complex: false })
    const own = await createItem({ project: plain.id })
    expect((await getWorkItem(own.id))!.project).toBeNull()

    const hiddenItem = await createItem({ hidden: true })
    const hiddenProject = await createProject('Скрытый', { complex: true, hidden: true })
    const ofHidden = await createItem({ project: hiddenProject.id })
    for (const id of [hiddenItem.id, ofHidden.id, 999_999_999]) {
      expect(await getWorkItem(id)).toBeNull()
      expect((await route(String(id))).status).toBe(404)
    }
  })

  it('Live Preview of an item opens its view; a new one — the feed of its type', async () => {
    const { Items } = await import('@/collections/Items')
    const url = Items.admin!.livePreview!.url as (args: { data: Record<string, unknown> }) => string
    const path = (data: Record<string, unknown>) =>
      decodeURIComponent(new URL(url({ data })).searchParams.get('path')!)
    expect(path({ id: 5, type: 'kitchens' })).toBe('/works?category=kitchens&item=5')
    expect(path({ type: 'bathrooms' })).toBe('/works?category=bathrooms')
    expect(path({})).toBe('/works')
  })

  it('a made-up id answers 404 before the database', async () => {
    const find = vi.spyOn(payload, 'find')
    try {
      for (const id of ['abc', '-1', '1.5', '0', '01', '9'.repeat(20)]) {
        expect(await getWorkItem(id)).toBeNull()
        expect((await route(id)).status).toBe(404)
      }
      expect(find).not.toHaveBeenCalled()
    } finally {
      find.mockRestore()
    }
  })

  it('the cached query of an item runs for visible items only', async () => {
    const visible = await createItem({})
    const hidden = await createItem({ hidden: true })
    const hiddenProject = await createProject('Скрытый кэш', { complex: true, hidden: true })
    const ofHidden = await createItem({ project: hiddenProject.id })
    const find = vi.spyOn(payload, 'find')
    // The query of one item (`where.id`), not the one of the works feeds
    const itemQueries = () =>
      find.mock.calls.filter(
        ([args]) => args.collection === 'items' && (args.where as { id?: unknown } | undefined)?.id,
      ).length
    try {
      for (const id of [999_999_999, hidden.id, ofHidden.id]) {
        expect(await getWorkItem(id)).toBeNull()
        expect((await route(String(id))).status).toBe(404)
      }
      expect(itemQueries()).toBe(0)

      expect((await getWorkItem(visible.id))?.id).toBe(visible.id)
      expect(itemQueries()).toBe(1)
      expect((await route(String(visible.id))).status).toBe(200)
      expect(itemQueries()).toBe(2)
    } finally {
      find.mockRestore()
    }
  })
})

describe('page of a project', () => {
  it('reads a visible complex project: its visible items in the editor’s order, «О проекте»', async () => {
    const project = await createProject('Страница', {
      complex: true,
      about: 'О квартире.',
      price: 2300000,
      designer: 'Анна',
      videos: [video.id],
    })
    const first = await createItem({ project: project.id, type: 'bathrooms' })
    await createItem({ project: project.id, hidden: true })
    const last = await createItem({ project: project.id, videos: [video.id] })

    const answer = await getWorkProject(project.slug)
    expect(answer && 'page' in answer).toBe(true)
    const page = answer && 'page' in answer ? answer.page : null
    expect(page!.zones.map((zone) => zone.id)).toEqual([first.id, last.id])
    expect(page!.frames.map((frame) => frame.owner)).toEqual([first.id, last.id, last.id])
    expect(page!.zones[1]!.href).toBe(`/works/${project.slug}?item=${last.id}`)
    expect(page!.meta[0]).toBe('2 зоны')
    expect(page!.meta[1]).toBe('2 фото + 2 видео')
    // The project video first (place 0), then the frames
    expect(page!.gallery.map((tile) => tile.kind)).toEqual(['reel', 'frame', 'frame', 'frame'])
    expect(page!.about?.designer).toBe('Анна')
    expect(page!.items[first.id]!.project?.slug).toBe(project.slug)
  })

  it('not complex — 308 to its first visible item; hidden or without visible items — nothing', async () => {
    const own = await createProject('Не комплекс')
    await createItem({ project: own.id, hidden: true })
    const first = await createItem({ project: own.id, type: 'hallways' })
    expect(await getWorkProject(own.slug)).toEqual({
      redirect: `/works?category=hallways&item=${first.id}`,
    })

    const hidden = await createProject('Скрытый проект', { complex: true, hidden: true })
    await createItem({ project: hidden.id })
    const empty = await createProject('Без изделий', { complex: true })
    const allHidden = await createProject('Скрытые изделия', { complex: true })
    await createItem({ project: allHidden.id, hidden: true })
    for (const { slug } of [hidden, empty, allHidden]) expect(await getWorkProject(slug)).toBeNull()

    // Unchecking «Комплекс» turns the page into a redirect
    const complex = await createProject('Был комплексом', { complex: true })
    const item = await createItem({ project: complex.id })
    expect(await getWorkProject(complex.slug)).toHaveProperty('page')
    await payload.update({ collection: 'projects', id: complex.id, data: { complex: false } })
    expect(await getWorkProject(complex.slug)).toEqual({
      redirect: `/works?category=kitchens&item=${item.id}`,
    })
    expect((await getProjectIndex()).find((p) => p.id === complex.id)?.complex).toBe(false)
  })

  it('the cached query of a page runs for visible complex projects only', async () => {
    const visible = await createProject('Кэш страницы', { complex: true })
    await createItem({ project: visible.id })
    const plain = await createProject('Кэш не комплекс')
    await createItem({ project: plain.id })
    const find = vi.spyOn(payload, 'find')
    // The query of one project (`where.id.equals`); not the feeds, not the populate of relations
    const pageQueries = () =>
      find.mock.calls.filter(
        ([args]) =>
          args.collection === 'projects' &&
          (args.where as { id?: { equals?: unknown } } | undefined)?.id?.equals !== undefined,
      ).length
    try {
      for (const slug of ['nope-nope', 'NOPE', 'a_b', '../x', '', 'кухня', plain.slug, 42]) {
        const answer = await getWorkProject(slug)
        expect(answer === null || 'redirect' in answer).toBe(true)
      }
      expect(pageQueries()).toBe(0)
      expect(await getWorkProject(visible.slug)).toHaveProperty('page')
      expect(pageQueries()).toBe(1)
    } finally {
      find.mockRestore()
    }
  })
})

describe('worksPage: the project page tab', () => {
  it('stores the CTA texts of a project page (the columns exist on a fresh database)', async () => {
    // A draft: no required fields of the other tabs to fill, the published page stays
    await payload.updateGlobal({
      slug: 'worksPage',
      draft: true,
      data: {
        project: {
          ctaTitle: 'Хотите так же?',
          ctaText: 'Рассчитаем под ваши размеры и пришлём смету.',
          ctaButton: 'Оставить заявку',
        },
      },
      context: { disableRevalidate: true },
    })
    const doc = await payload.findGlobal({ slug: 'worksPage', draft: true, depth: 0 })
    expect(doc.project).toMatchObject({ ctaTitle: 'Хотите так же?', ctaButton: 'Оставить заявку' })
  })
})

describe('works cache tags', () => {
  it('writes of projects and items expire their own tags', async () => {
    revalidateTag.mockClear()
    const project = await createProject('теги')
    const item = await createItem({ project: project.id })
    const tags = revalidateTag.mock.calls.map(([tag]) => tag)
    expect(tags).toContain('collection:projects')
    expect(tags).toContain('collection:items')
    // Hiding an item or unchecking «Комплекс» expires the tags of the page of the project too
    revalidateTag.mockClear()
    await payload.update({ collection: 'items', id: item.id, data: { hidden: true } })
    await payload.update({ collection: 'projects', id: project.id, data: { complex: true } })
    const after = revalidateTag.mock.calls.map(([tag]) => tag)
    expect(after).toEqual(expect.arrayContaining(['collection:items', 'collection:projects']))
  })
})
