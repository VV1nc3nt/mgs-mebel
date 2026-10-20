import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { About, Media, News } from '@/payload-types'

import { cleanup, createImage, createVideo, getTestPayload, pngFile, PREFIX } from './helpers'

let payload: Payload
let image: Media
let video: Media

beforeAll(async () => {
  payload = await getTestPayload()
  image = await createImage(payload)
  video = await createVideo(payload)
})

afterAll(async () => {
  await cleanup(payload)
})

let counter = 0

const createNews = (body: News['body']) =>
  payload.create({
    collection: 'news',
    data: {
      title: `${PREFIX} видео ${++counter}`,
      slug: `${PREFIX}-video-${counter}`,
      type: 'news',
      date: '2026-01-01',
      cover: image.id,
      body,
      _status: 'published',
    },
  })

const videoBlock = (
  fields: Partial<Extract<NonNullable<News['body']>[number], { blockType: 'video' }>>,
) => [{ blockType: 'video' as const, poster: image.id, ...fields }]

describe('news video block', () => {
  it('requires a file or a link', async () => {
    await expect(createNews(videoBlock({}))).rejects.toThrow()
  })

  it('rejects both a file and a link', async () => {
    await expect(
      createNews(videoBlock({ file: video.id, embedUrl: 'https://rutube.ru/video/abc/' })),
    ).rejects.toThrow()
  })

  it('rejects links outside the whitelist and plain http', async () => {
    await expect(createNews(videoBlock({ embedUrl: 'https://vimeo.com/123' }))).rejects.toThrow()
    await expect(
      createNews(videoBlock({ embedUrl: 'https://www.youtube.com/watch?v=abc' })),
    ).rejects.toThrow()
    await expect(
      createNews(videoBlock({ embedUrl: 'http://rutube.ru/video/abc/' })),
    ).rejects.toThrow()
  })

  it('accepts RuTube, VK Video and a video file', async () => {
    await expect(
      createNews(videoBlock({ embedUrl: 'https://rutube.ru/video/abc/' })),
    ).resolves.toBeTruthy()
    await expect(
      createNews(videoBlock({ embedUrl: 'https://vkvideo.ru/video-1_2' })),
    ).resolves.toBeTruthy()
    await expect(
      createNews(videoBlock({ embedUrl: 'https://vk.ru/video-1_2' })),
    ).resolves.toBeTruthy()
    await expect(createNews(videoBlock({ file: video.id }))).resolves.toBeTruthy()
  })

  it('rejects an image as the video file', async () => {
    await expect(createNews(videoBlock({ file: image.id }))).rejects.toThrow()
  })
})

describe('about.mission (presentation)', () => {
  // Nullable: clearing a field is what an editor does in the admin
  type Mission = { [K in keyof NonNullable<About['mission']>]?: unknown }
  let before: Record<string, unknown> | undefined

  beforeAll(async () => {
    before = (await payload.findGlobal({ slug: 'about', depth: 0 })) as unknown as Record<
      string,
      unknown
    >
  })

  // Put the stored global back; one that did not exist is removed with its versions, so the
  // test media can be deleted.
  afterAll(async () => {
    if (before?.createdAt) {
      const { id: _id, createdAt: _c, updatedAt: _u, globalType: _g, ...data } = before
      await payload.updateGlobal({
        slug: 'about',
        data: { ...data, _status: 'published' } as never,
      })
    } else {
      await payload.db.drizzle.execute(sql`delete from "_about_v"`)
      await payload.db.drizzle.execute(sql`delete from "about"`)
    }
  })

  const publish = (mission: Mission) =>
    payload.updateGlobal({
      slug: 'about',
      data: {
        hero: { title: `${PREFIX} о нас`, poster: image.id },
        history: { photoMain: image.id },
        hardware: { poster: image.id },
        mission: { poster: image.id, ...mission },
        _status: 'published',
      } as never,
    })

  it('requires the poster on publishing', async () => {
    await expect(publish({ poster: null })).rejects.toThrow()
  })

  it('accepts a file, a link or neither (a poster without ▶)', async () => {
    await expect(publish({})).resolves.toBeTruthy()
    await expect(publish({ video: video.id, embedUrl: null })).resolves.toBeTruthy()
    await expect(
      publish({ video: null, embedUrl: 'https://rutube.ru/video/abc/' }),
    ).resolves.toBeTruthy()
    await expect(
      publish({ video: null, embedUrl: 'https://m.vk.ru/video-1_2' }),
    ).resolves.toBeTruthy()
  })

  it('rejects both a file and a link', async () => {
    await expect(
      publish({ video: video.id, embedUrl: 'https://vkvideo.ru/video-1_2' }),
    ).rejects.toThrow()
  })

  it('rejects links outside RuTube / VK Video', async () => {
    await expect(
      publish({ video: null, embedUrl: 'https://www.youtube.com/watch?v=abc' }),
    ).rejects.toThrow()
    await expect(
      publish({ video: null, embedUrl: 'http://rutube.ru/video/abc/' }),
    ).rejects.toThrow()
  })

  it('rejects an image as the video file', async () => {
    await expect(publish({ video: image.id, embedUrl: null })).rejects.toThrow()
  })
})

describe('news media block', () => {
  it('requires at least one photo', async () => {
    await expect(createNews([{ blockType: 'media', photos: [] }])).rejects.toThrow()
    await expect(
      createNews([{ blockType: 'media', photos: [image.id], ratio: '4x5' }]),
    ).resolves.toBeTruthy()
  })
})

describe('media alt', () => {
  it('is required for images only', async () => {
    await expect(
      payload.create({ collection: 'media', data: {}, file: await pngFile(`${PREFIX}-noalt.png`) }),
    ).rejects.toThrow()
    await expect(createVideo(payload, `${PREFIX}-noalt.mp4`)).resolves.toBeTruthy()
  })
})

describe('salon coordinates', () => {
  const createSalon = (location: { lat?: number; lng?: number }) =>
    payload.create({
      collection: 'salons',
      data: { name: `${PREFIX} салон`, address: 'Москва', poster: image.id, location },
    })

  it('requires both coordinates or none', async () => {
    await expect(createSalon({ lat: 55.6 })).rejects.toThrow()
    await expect(createSalon({ lng: 37.6 })).rejects.toThrow()
    await expect(createSalon({})).resolves.toBeTruthy()
    await expect(createSalon({ lat: 55.6, lng: 37.6 })).resolves.toBeTruthy()
  })

  it('rejects out-of-range values', async () => {
    await expect(createSalon({ lat: 91, lng: 37.6 })).rejects.toThrow()
  })
})

describe('salonsPage.map.emptyText', () => {
  it('defaults to «Скоро откроемся» in the admin and in the column', async () => {
    const tab = payload.config.globals
      .find((global) => global.slug === 'salonsPage')
      ?.fields.flatMap((field) => ('tabs' in field ? field.tabs : []))
      .find((t) => 'name' in t && t.name === 'map')
    const field = tab?.fields.find((f) => 'name' in f && f.name === 'emptyText')
    expect(field && 'defaultValue' in field ? field.defaultValue : undefined).toBe(
      'Скоро откроемся',
    )

    // The column default fills the existing rows when the migration adds it.
    const { rows } = await payload.db.drizzle.execute(sql`
      select table_name, column_default from information_schema.columns
      where column_name in ('map_empty_text', 'version_map_empty_text')
        and table_name in ('salons_page', '_salons_page_v')`)
    expect(rows).toHaveLength(2)
    for (const row of rows) expect(String(row.column_default)).toContain('Скоро откроемся')
  })
})
