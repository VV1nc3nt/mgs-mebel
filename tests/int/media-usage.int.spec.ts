import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { cleanup, createImage, getTestPayload, pdfFile, PREFIX } from './helpers'

let payload: Payload

beforeAll(async () => {
  payload = await getTestPayload()
})

afterAll(async () => {
  await cleanup(payload)
})

describe('deleting media that is in use', () => {
  it('is refused with the list of places', async () => {
    const cover = await createImage(payload)
    const pdf = await payload.create({ collection: 'media', data: {}, file: pdfFile() })
    await payload.create({
      collection: 'catalogs',
      data: { title: `${PREFIX} Кухни 2026`, category: 'kitchens', cover: cover.id, pdf: pdf.id },
    })
    await payload.create({
      collection: 'news',
      data: {
        title: `${PREFIX} Новость с фото`,
        slug: `${PREFIX}-news-photo`,
        type: 'news',
        date: '2026-01-01',
        cover: (await createImage(payload)).id,
        body: [{ blockType: 'media', photos: [cover.id] }],
        _status: 'published',
      },
    })

    const attempt = payload.delete({ collection: 'media', id: cover.id })
    await expect(attempt).rejects.toThrow()
    const error = await attempt.catch((e: { data?: { errors?: { message: string }[] } }) => e)
    const message =
      (error as { data?: { errors?: { message: string }[] } }).data?.errors?.[0]?.message ?? ''
    expect(message).toContain(`Каталоги: «${PREFIX} Кухни 2026»`)
    expect(message).toContain(`Новости: «${PREFIX} Новость с фото»`)

    // Still there.
    await expect(payload.findByID({ collection: 'media', id: cover.id })).resolves.toBeTruthy()
  })

  it('is allowed once the file is no longer referenced', async () => {
    const image = await createImage(payload)
    await expect(payload.delete({ collection: 'media', id: image.id })).resolves.toBeTruthy()
  })
})
