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

const { getWorkFeeds, getWorkItem } = await import('@/lib/queries')
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
})

describe('works cache tags', () => {
  it('writes of projects and items expire their own tags', async () => {
    revalidateTag.mockClear()
    const project = await createProject('теги')
    await createItem({ project: project.id })
    const tags = revalidateTag.mock.calls.map(([tag]) => tag)
    expect(tags).toContain('collection:projects')
    expect(tags).toContain('collection:items')
  })
})
