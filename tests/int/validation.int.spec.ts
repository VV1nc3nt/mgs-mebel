import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Media, News } from '@/payload-types'

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
      createNews(videoBlock({ embedUrl: 'http://rutube.ru/video/abc/' })),
    ).rejects.toThrow()
  })

  it('accepts RuTube, YouTube and a video file', async () => {
    await expect(
      createNews(videoBlock({ embedUrl: 'https://rutube.ru/video/abc/' })),
    ).resolves.toBeTruthy()
    await expect(
      createNews(videoBlock({ embedUrl: 'https://www.youtube.com/watch?v=abc' })),
    ).resolves.toBeTruthy()
    await expect(createNews(videoBlock({ file: video.id }))).resolves.toBeTruthy()
  })

  it('rejects an image as the video file', async () => {
    await expect(createNews(videoBlock({ file: image.id }))).rejects.toThrow()
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

describe('project slides', () => {
  const createProject = (slides: { type: 'video' | 'photo'; file: number; poster?: number }[]) =>
    payload.create({
      collection: 'projects',
      data: {
        title: `${PREFIX} проект ${++counter}`,
        slug: `${PREFIX}-project-${counter}`,
        category: 'kitchens',
        slides,
      },
    })

  it('accepts a video first, photos after', async () => {
    await expect(
      createProject([
        { type: 'video', file: video.id, poster: image.id },
        { type: 'photo', file: image.id },
      ]),
    ).resolves.toBeTruthy()
  })

  it('rejects a video in the second slide', async () => {
    await expect(
      createProject([
        { type: 'photo', file: image.id },
        { type: 'video', file: video.id, poster: image.id },
      ]),
    ).rejects.toThrow()
  })

  it('rejects a file that does not match the slide type', async () => {
    await expect(createProject([{ type: 'photo', file: video.id }])).rejects.toThrow()
    await expect(
      createProject([{ type: 'video', file: image.id, poster: image.id }]),
    ).rejects.toThrow()
  })

  it('requires a poster for video slides', async () => {
    await expect(createProject([{ type: 'video', file: video.id }])).rejects.toThrow()
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
      data: { name: `${PREFIX} салон`, address: 'Москва', location },
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
