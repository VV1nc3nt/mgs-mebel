import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Layout } from '@/payload-types'

import { globals } from '@/seed/data/globals'

import { getTestPayload } from './helpers'

// Required fields of the global (nav, dock) from the seed: the database may be fresh
const { layout } = globals(() => 0)

let payload: Payload
let before: Layout

const cookies = {
  lead: 'Мы используем cookies',
  text: '— чтобы сайт работал корректно и становился лучше.',
  rejectLabel: 'Отказаться',
  necessaryLabel: 'Только необходимые',
  acceptLabel: 'Принять все',
}

beforeAll(async () => {
  payload = await getTestPayload()
  before = await payload.findGlobal({ slug: 'layout', depth: 0 })
})

afterAll(async () => {
  if (!payload || !before) return
  if (before.createdAt) {
    // Raw DB write: the global as it was, without the validation of today's fields
    await payload.db.updateGlobal({
      slug: 'layout',
      data: { nav: before.nav, dock: before.dock, footer: before.footer, cookies: before.cookies },
    })
  } else {
    await payload.db.drizzle.execute(sql`delete from "layout"`)
  }
})

describe('footer and cookie notice: schema', () => {
  it('the migration added the columns with the defaults of the notice', async () => {
    const { rows } = await payload.db.drizzle.execute(sql`
      select column_name, column_default from information_schema.columns
      where table_name = 'layout' and column_name like 'cookies_%'
      order by column_name`)
    const defaults = Object.fromEntries(
      (rows as { column_name: string; column_default: string | null }[]).map((r) => [
        r.column_name,
        r.column_default,
      ]),
    )
    expect(defaults.cookies_accept_label).toContain('Принять все')
    expect(defaults.cookies_reject_label).toContain('Отказаться')
    expect(defaults.cookies_more_label).toBeNull()
    for (const name of ['layout_footer_buyer_links']) {
      const { rows: t } = await payload.db.drizzle.execute(
        sql.raw(`select to_regclass('public.${name}')::text as t`),
      )
      expect((t[0] as { t: string | null }).t).toBe(name)
    }
    const { rows: settings } = await payload.db.drizzle.execute(sql`
      select column_name from information_schema.columns
      where table_name = 'settings' and column_name like 'requisites_%' order by column_name`)
    expect((settings as { column_name: string }[]).map((r) => r.column_name)).toEqual([
      'requisites_company',
      'requisites_hours',
      'requisites_inn',
      'requisites_legal_address',
      'requisites_ogrn',
    ])
  })

  it('the text and the three labels of the notice are required', async () => {
    await expect(
      payload.updateGlobal({ slug: 'layout', data: { ...layout, cookies }, depth: 0 }),
    ).resolves.toBeTruthy()
    for (const key of Object.keys(cookies)) {
      await expect(
        payload.updateGlobal({
          slug: 'layout',
          data: { ...layout, cookies: { ...cookies, [key]: ' ' } },
          depth: 0,
        }),
        key,
      ).rejects.toThrow()
    }
    // «Подробнее» is optional
    await expect(
      payload.updateGlobal({
        slug: 'layout',
        data: { ...layout, cookies: { ...cookies, moreLabel: null } },
        depth: 0,
      }),
    ).resolves.toBeTruthy()
  })

  it('buyer links: own paths and https only', async () => {
    const save = (href: string) =>
      payload.updateGlobal({
        slug: 'layout',
        data: {
          ...layout,
          cookies,
          footer: { ...layout.footer, buyerLinks: [{ label: 'Ссылка', href }] },
        },
        depth: 0,
      })
    for (const href of ['/delivery', 'https://example.org/a']) {
      await expect(save(href), href).resolves.toBeTruthy()
    }
    for (const href of ['//example.org', 'http://example.org', 'javascript:alert(1)', 'delivery']) {
      await expect(save(href), href).rejects.toThrow()
    }
  })
})
