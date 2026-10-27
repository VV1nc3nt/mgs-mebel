import { sql } from '@payloadcms/db-postgres'
import { handleEndpoints, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { Setting, User } from '@/payload-types'

import {
  cleanup,
  createImage,
  createRoleUsers,
  getTestPayload,
  pdfFile,
  pngFile,
  PREFIX,
} from './helpers'

let payload: Payload
let users: Awaited<ReturnType<typeof createRoleUsers>>
let settingsBefore: Setting

const as = (user: User) => ({ user, overrideAccess: false })

beforeAll(async () => {
  payload = await getTestPayload()
  users = await createRoleUsers(payload)
  settingsBefore = await payload.findGlobal({ slug: 'settings' })
  await payload.updateGlobal({
    slug: 'settings',
    data: {
      contacts: { hotlinePhone: settingsBefore.contacts?.hotlinePhone || '8 800 000-00-00' },
      technical: { consultantWidgetCode: `<script>/* ${PREFIX} */</script>` },
    },
  })
})

afterAll(async () => {
  // beforeAll may have failed before reading the global: then there is nothing to restore.
  if (!payload) return
  if (!settingsBefore) return cleanup(payload)
  if (settingsBefore.createdAt) {
    // Raw DB write: skips validation of fields other roles may have left empty.
    await payload.db.updateGlobal({
      slug: 'settings',
      data: {
        contacts: settingsBefore.contacts,
        messengers: settingsBefore.messengers,
        designerManager: settingsBefore.designerManager,
        requisites: settingsBefore.requisites,
        technical: { consultantWidgetCode: settingsBefore.technical?.consultantWidgetCode ?? null },
      },
    })
  } else {
    // The global did not exist before the test: remove the row the test created.
    await payload.db.drizzle.execute(sql`delete from "settings"`)
  }
  await cleanup(payload)
})

describe('salons', () => {
  let poster: Awaited<ReturnType<typeof createImage>>
  beforeAll(async () => {
    poster = await createImage(payload)
  })

  it('content reads but cannot change salons', async () => {
    const salon = await payload.create({
      collection: 'salons',
      data: { name: `${PREFIX} салон`, address: 'Москва', poster: poster.id },
    })
    await expect(
      payload.findByID({ collection: 'salons', id: salon.id, ...as(users.content) }),
    ).resolves.toBeTruthy()
    await expect(
      payload.update({
        collection: 'salons',
        id: salon.id,
        data: { phone: '1' },
        ...as(users.content),
      }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'salons',
        id: salon.id,
        data: { phone: '2' },
        ...as(users.manager),
      }),
    ).resolves.toMatchObject({ phone: '2' })
  })

  it('requires the card photo through the Local API', async () => {
    // ValidationError: the message lists the fields, the field's own text is in `data.errors`.
    const noPhoto = {
      data: {
        errors: [expect.objectContaining({ path: 'poster', message: 'Добавьте фото карточки' })],
      },
    }
    const data = { name: `${PREFIX} салон без фото`, address: 'Москва' }
    await expect(payload.create({ collection: 'salons', data })).rejects.toMatchObject(noPhoto)
    const salon = await payload.create({
      collection: 'salons',
      data: { ...data, poster: poster.id },
    })
    await expect(
      payload.update({ collection: 'salons', id: salon.id, data: { poster: null } }),
    ).rejects.toMatchObject(noPhoto)
    // A partial update keeps the stored photo.
    await expect(
      payload.update({ collection: 'salons', id: salon.id, data: { phone: '3' } }),
    ).resolves.toMatchObject({ phone: '3' })
  })

  it('requires the card photo through the REST API (admin session)', async () => {
    const { token } = await payload.login({
      collection: 'users',
      data: { email: users.admin.email, password: 'test-password' },
    })
    const send = (method: 'POST' | 'PATCH', path: string, body: object) =>
      handleEndpoints({
        config,
        request: new Request(`http://localhost/api/salons${path}`, {
          method,
          headers: { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      })
    const data = { name: `${PREFIX} салон REST`, address: 'Москва' }

    const missing = await send('POST', '', data)
    expect(missing.status).toBe(400)
    expect(JSON.stringify(await missing.json())).toContain('Добавьте фото карточки')

    const created = await send('POST', '', { ...data, poster: poster.id })
    expect(created.status).toBe(201)
    const { doc } = (await created.json()) as { doc: { id: number } }

    const cleared = await send('PATCH', `/${doc.id}`, { poster: null })
    expect(cleared.status).toBe(400)
  })

  it('accepts opening hours as people write them, rejects anything else', async () => {
    const badHours = {
      data: {
        errors: [expect.objectContaining({ path: 'hours', message: 'Формат: Пн–Вс 10:00–21:00' })],
      },
    }
    const data = { name: `${PREFIX} салон часы`, address: 'Москва', poster: poster.id }
    await expect(
      payload.create({ collection: 'salons', data: { ...data, hours: 'Mo-Su 10:00-21:00' } }),
    ).rejects.toMatchObject(badHours)
    const salon = await payload.create({
      collection: 'salons',
      data: { ...data, hours: 'Пн–Пт 10:00–21:00; Сб–Вс 11:00–20:00' },
    })
    expect(salon.hours).toBe('Пн–Пт 10:00–21:00; Сб–Вс 11:00–20:00')
    await expect(
      payload.update({ collection: 'salons', id: salon.id, data: { hours: 'ежедневно' } }),
    ).rejects.toMatchObject(badHours)
    // Empty is fine: no openingHours in JSON-LD then
    await expect(
      payload.update({ collection: 'salons', id: salon.id, data: { hours: '' } }),
    ).resolves.toBeTruthy()
  })
})

describe('settings.technical', () => {
  it('is hidden from content, manager and anonymous users', async () => {
    for (const user of [users.content, users.manager]) {
      const settings = await payload.findGlobal({ slug: 'settings', ...as(user) })
      expect(settings.technical?.consultantWidgetCode).toBeUndefined()
    }
    const anonymous = await payload.findGlobal({ slug: 'settings', overrideAccess: false })
    expect(anonymous.technical?.consultantWidgetCode).toBeUndefined()
  })

  it('is not returned by the anonymous REST API', async () => {
    const response = await handleEndpoints({
      config,
      request: new Request('http://localhost/api/globals/settings'),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.contacts).toBeDefined()
    expect(body.technical?.consultantWidgetCode).toBeUndefined()
  })

  it('admin reads but cannot change it, developer can', async () => {
    const read = await payload.findGlobal({ slug: 'settings', ...as(users.admin) })
    expect(read.technical?.consultantWidgetCode).toContain(PREFIX)

    await payload.updateGlobal({
      slug: 'settings',
      data: { technical: { consultantWidgetCode: 'changed-by-admin' } },
      ...as(users.admin),
    })
    const afterAdmin = await payload.findGlobal({ slug: 'settings' })
    expect(afterAdmin.technical?.consultantWidgetCode).toContain(PREFIX)

    await payload.updateGlobal({
      slug: 'settings',
      data: { technical: { consultantWidgetCode: `dev-${PREFIX}` } },
      ...as(users.developer),
    })
    const afterDeveloper = await payload.findGlobal({ slug: 'settings' })
    expect(afterDeveloper.technical?.consultantWidgetCode).toBe(`dev-${PREFIX}`)
  })

  it('content cannot update settings at all', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'settings',
        data: { contacts: { email: 'x@test.local' } },
        ...as(users.content),
      }),
    ).rejects.toThrow()
  })
})

describe('settings.requisites', () => {
  const requisites = {
    company: `${PREFIX} ООО`,
    inn: '7700000000',
    ogrn: '1027700000000',
    legalAddress: 'Москва',
    hours: '9–21',
  }

  it('as the contacts: manager and admin change them, content only reads, anonymous reads', async () => {
    for (const user of [users.manager, users.admin, users.developer]) {
      await expect(
        payload.updateGlobal({ slug: 'settings', data: { requisites }, ...as(user) }),
      ).resolves.toBeTruthy()
    }
    await expect(
      payload.updateGlobal({
        slug: 'settings',
        data: { requisites: { company: 'content' } },
        ...as(users.content),
      }),
    ).rejects.toThrow()
    const read = await payload.findGlobal({ slug: 'settings', ...as(users.content) })
    expect(read.requisites?.company).toBe(requisites.company)
    const anonymous = await payload.findGlobal({ slug: 'settings', overrideAccess: false })
    expect(anonymous.requisites).toMatchObject(requisites)
  })

  it('ИНН — 10 or 12 digits, ОГРН — 13 or 15; empty is fine', async () => {
    const save = (data: Record<string, string | null>) =>
      payload.updateGlobal({ slug: 'settings', data: { requisites: data } })
    for (const inn of ['770000000', '77000000001', '77000000000a']) {
      await expect(save({ inn }), inn).rejects.toThrow()
    }
    for (const ogrn of ['102770000000', '10277000000001']) {
      await expect(save({ ogrn }), ogrn).rejects.toThrow()
    }
    await expect(save({ inn: '770000000000', ogrn: '102770000000000' })).resolves.toBeTruthy()
    await expect(save({ inn: null, ogrn: '' })).resolves.toBeTruthy()
  })
})

describe('settings links', () => {
  const setMessengers = (messengers: Record<string, string>) =>
    payload.updateGlobal({ slug: 'settings', data: { messengers } })

  it('accepts https links and wa.me for WhatsApp', async () => {
    await expect(
      setMessengers({
        max: 'https://max.ru/join/abc',
        whatsapp: 'https://wa.me/79270963555',
        telegram: 'https://t.me/mgsmebel_official',
      }),
    ).resolves.toBeTruthy()
  })

  it('rejects http, garbage and non-wa.me WhatsApp links', async () => {
    await expect(setMessengers({ telegram: 'http://t.me/x' })).rejects.toThrow()
    await expect(setMessengers({ max: 'max.ru/join' })).rejects.toThrow()
    await expect(setMessengers({ whatsapp: 'https://example.com/79270963555' })).rejects.toThrow()
    await expect(
      payload.updateGlobal({
        slug: 'settings',
        data: { designerManager: { whatsapp: 'http://wa.me/79957839428' } },
      }),
    ).rejects.toThrow()
  })
})

describe('manager', () => {
  it('cannot create news or edit page globals', async () => {
    const cover = await createImage(payload)
    await expect(
      payload.create({
        collection: 'news',
        data: {
          title: `${PREFIX} news`,
          slug: `${PREFIX}-news`,
          type: 'news',
          date: '2026-01-01',
          cover: cover.id,
          _status: 'published',
        },
        ...as(users.manager),
      }),
    ).rejects.toThrow()
    await expect(
      payload.updateGlobal({
        slug: 'home',
        data: { hero: { title: 'x' } } as never,
        ...as(users.manager),
      }),
    ).rejects.toThrow()
  })

  it('manages catalogs and uploads media, but cannot delete media', async () => {
    const image = await payload.create({
      collection: 'media',
      data: { alt: 'manager' },
      file: await pngFile(`${PREFIX}-manager.png`),
      ...as(users.manager),
    })
    await expect(
      payload.update({
        collection: 'media',
        id: image.id,
        data: { alt: 'renamed' },
        ...as(users.manager),
      }),
    ).resolves.toMatchObject({ alt: 'renamed' })
    await expect(
      payload.delete({ collection: 'media', id: image.id, ...as(users.manager) }),
    ).rejects.toThrow()

    const cover = await createImage(payload)
    const pdf = await payload.create({
      collection: 'media',
      data: {},
      file: pdfFile(),
    })
    const catalog = await payload.create({
      collection: 'catalogs',
      data: { title: `${PREFIX} каталог`, category: 'kitchens', cover: cover.id, pdf: pdf.id },
      ...as(users.manager),
    })
    await expect(
      payload.update({
        collection: 'catalogs',
        id: catalog.id,
        data: { pages: 10 },
        ...as(users.manager),
      }),
    ).resolves.toMatchObject({ pages: 10 })
    await expect(
      payload.delete({ collection: 'catalogs', id: catalog.id, ...as(users.manager) }),
    ).resolves.toBeTruthy()
  })
})

describe('news drafts', () => {
  it('anonymous users only see published news', async () => {
    const cover = await createImage(payload)
    const draft = await payload.create({
      collection: 'news',
      data: {
        title: `${PREFIX} черновик`,
        type: 'news',
        date: '2026-01-01',
        cover: cover.id,
        _status: 'draft',
      },
      draft: true,
    })
    const anonymous = await payload.find({
      collection: 'news',
      where: { id: { equals: draft.id } },
      overrideAccess: false,
    })
    expect(anonymous.totalDocs).toBe(0)
    const content = await payload.find({
      collection: 'news',
      where: { id: { equals: draft.id } },
      ...as(users.content),
      draft: true,
    })
    expect(content.totalDocs).toBe(1)
  })
})

describe('users and roles', () => {
  it('admin cannot create a developer or promote to developer', async () => {
    await expect(
      payload.create({
        collection: 'users',
        data: {
          email: `${PREFIX}-new-dev@test.local`,
          password: 'test-password',
          role: 'developer',
        },
        ...as(users.admin),
      }),
    ).rejects.toThrow()

    const promoted = payload.update({
      collection: 'users',
      id: users.content.id,
      data: { role: 'developer' },
      ...as(users.admin),
    })
    await expect(promoted).rejects.toThrow()
    const after = await payload.findByID({ collection: 'users', id: users.content.id })
    expect(after.role).toBe('content')
  })

  it('admin cannot see or edit developers', async () => {
    const found = await payload.find({
      collection: 'users',
      where: { email: { like: PREFIX } },
      ...as(users.admin),
    })
    expect(found.docs.map((u) => u.role)).not.toContain('developer')
  })

  it('manager and content only see themselves', async () => {
    for (const user of [users.manager, users.content]) {
      const found = await payload.find({
        collection: 'users',
        where: { email: { like: PREFIX } },
        ...as(user),
      })
      expect(found.docs.map((u) => u.id)).toEqual([user.id])
    }
  })

  it.each(['developer', 'admin', 'manager', 'content'] as const)(
    '%s cannot change their own role',
    async (role) => {
      const user = users[role]
      const target = role === 'content' ? 'manager' : 'content'
      await payload
        .update({ collection: 'users', id: user.id, data: { role: target }, ...as(user) })
        .catch(() => null)
      const after = await payload.findByID({ collection: 'users', id: user.id })
      expect(after.role).toBe(role)

      // Even with collection access bypassed, the hook refuses.
      await expect(
        payload.update({ collection: 'users', id: user.id, data: { role: target }, user }),
      ).rejects.toThrow()
    },
  )

  it('new users default to content', async () => {
    const created = await payload.create({
      collection: 'users',
      data: { email: `${PREFIX}-default@test.local`, password: 'test-password' } as never,
      ...as(users.admin),
    })
    expect(created.role).toBe('content')
  })
})
