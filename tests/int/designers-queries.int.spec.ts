import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { Setting } from '@/payload-types'
import { cleanup, createImage, createVideo, getTestPayload, PREFIX } from './helpers'

// Outside a Next request: no request scope for connection(); the cache only records its options.
const caches = vi.hoisted(() => [] as { keys: string[]; tags: string[] }[])
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(
    fn: T,
    keys: string[],
    options: { tags: string[] },
  ) => {
    caches.push({ keys, tags: options.tags })
    return fn
  },
  // Writes in these tests go through the cache hooks (lib/revalidate.ts)
  revalidateTag: () => {},
}))

const { getDesignerManager, getSettings } = await import('@/lib/queries')

describe('getDesignerManager', () => {
  let payload: Payload
  let before: Setting['designerManager']

  beforeAll(async () => {
    payload = await getTestPayload()
    before = (await payload.findGlobal({ slug: 'settings', depth: 0 })).designerManager
    const photo = await createImage(payload)
    await payload.updateGlobal({
      slug: 'settings',
      data: {
        designerManager: {
          photo: photo.id,
          name: `${PREFIX} manager`,
          position: 'Руководитель развития',
          phone: '8 995 783-94-28',
          max: null,
          whatsapp: 'https://wa.me/79957839428',
          telegram: 'https://t.me/manager',
        },
      },
      depth: 0,
    })
  })

  afterAll(async () => {
    await payload.updateGlobal({
      slug: 'settings',
      data: {
        designerManager: {
          ...before,
          photo: typeof before?.photo === 'object' ? (before.photo?.id ?? null) : before?.photo,
        },
      },
      depth: 0,
    })
    await cleanup(payload)
  })

  it('is cached apart from the header data, under the settings tag', () => {
    expect(caches).toContainEqual({
      keys: ['global:settings:designer-manager'],
      tags: ['global:settings'],
    })
  })

  it('the manager only, with the photo populated: url (needs filename), alt, sizes', async () => {
    const manager = await getDesignerManager()
    expect(manager.name).toBe(`${PREFIX} manager`)
    expect(manager.telegram).toBe('https://t.me/manager')
    expect(manager.max ?? null).toBeNull()
    const photo = manager.photo
    if (!photo || typeof photo !== 'object') throw new Error('photo is not populated')
    expect(photo.url).not.toBeNull()
    expect(photo.alt).toBe('test')
    expect(photo.sizes?.thumb?.url ?? photo.url).not.toBeNull()
    // The header data stays without the manager
    expect(await getSettings()).not.toHaveProperty('designerManager')
  })
})

// Drafts: the published page is left as it is (a fresh database has no published hero either)
describe('designers global: projects', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  afterAll(async () => {
    await cleanup(payload)
  })

  it('keeps the order, the hidden flag and the optional video; no `project` tab', async () => {
    const poster = await createImage(payload)
    const video = await createVideo(payload)
    const saved = await payload.updateGlobal({
      slug: 'designers',
      data: {
        projects: {
          label: 'проекты',
          title: 'Реализованные проекты',
          items: [
            { title: `${PREFIX} A`, poster: poster.id, video: video.id },
            { title: `${PREFIX} B`, poster: poster.id, hidden: true },
            { title: `${PREFIX} C`, meta: 'meta', poster: poster.id },
          ],
        },
      },
      draft: true,
      depth: 0,
    })
    expect(saved.projects?.items?.map((p) => [p.title, p.hidden, p.video ?? null])).toEqual([
      [`${PREFIX} A`, false, video.id],
      [`${PREFIX} B`, true, null],
      [`${PREFIX} C`, false, null],
    ])
    expect(saved).not.toHaveProperty('project')
  })

  it('publishing: a project needs a title and a poster', async () => {
    const error = await payload
      .updateGlobal({
        slug: 'designers',
        data: { projects: { items: [{ title: '' } as never] }, _status: 'published' },
        depth: 0,
      })
      .catch((e: { data?: { errors?: { path: string }[] } }) => e)
    const paths = (error as { data?: { errors?: { path: string }[] } }).data?.errors?.map(
      (e) => e.path,
    )
    expect(paths).toEqual(
      expect.arrayContaining(['projects.items.0.title', 'projects.items.0.poster']),
    )
  })
})
