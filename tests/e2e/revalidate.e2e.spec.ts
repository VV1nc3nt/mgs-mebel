import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { e2eEditor } from '../helpers/e2eEditor'
import { E2E_REVALIDATE_SECRET } from '../helpers/revalidate'

// Published data is cached without a time limit; the Payload hooks expire it on publishing.
// Every check reads the page right after the write, with no waiting.
const BASE = 'http://localhost:3000'
const EMPTY_DB = !!process.env.E2E_EMPTY_DB

const login = async (request: APIRequestContext) => {
  const response = await request.post(`${BASE}/api/users/login`, {
    data: { email: e2eEditor.email, password: e2eEditor.password },
  })
  expect(response.ok()).toBe(true)
}

const h1 = async (page: Page, path: string) => {
  const response = await page.goto(`${BASE}${path}`)
  return { status: response?.status(), title: await page.locator('h1').first().textContent() }
}

test.describe('cache revalidation', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedHome.ts data')

  test('page global: autosave keeps the published page, publishing shows at once', async ({
    page,
  }) => {
    await login(page.request)
    const url = `${BASE}/api/globals/about?depth=0`
    const published = await (await page.request.get(`${url}&draft=false`)).json()
    const title = published.hero.title as string
    const save = (heroTitle: string, query: string, status: 'draft' | 'published') =>
      page.request.post(`${BASE}/api/globals/about?depth=0${query}`, {
        data: { ...published, hero: { ...published.hero, title: heroTitle }, _status: status },
      })

    try {
      // Warm the cache with the published title
      expect((await h1(page, '/about')).title).toBe(title)

      expect((await save('E2E: автосохранение', '&draft=true&autosave=true', 'draft')).ok()).toBe(
        true,
      )
      expect((await h1(page, '/about')).title).toBe(title)

      expect((await save('E2E: опубликовано', '', 'published')).ok()).toBe(true)
      expect((await h1(page, '/about')).title).toBe('E2E: опубликовано')
    } finally {
      expect((await save(title, '', 'published')).ok()).toBe(true)
    }
    expect((await h1(page, '/about')).title).toBe(title)
  })

  test('news: a cached 404 turns into the page on publishing, and back on unpublishing', async ({
    page,
  }) => {
    await login(page.request)
    const media = await (
      await page.request.get(`${BASE}/api/media?limit=1&depth=0&where[mimeType][contains]=image`)
    ).json()
    const cover = media.docs[0].id as number
    const slug = 'e2e-revalidate'
    const title = 'E2E: ревалидация'
    // An old date: the home slider (latest three) never shows it.
    const created = await page.request.post(`${BASE}/api/news?draft=true&depth=0`, {
      data: { title, slug, type: 'news', date: '2001-01-01', cover },
    })
    expect(created.ok()).toBe(true)
    const { doc } = await created.json()
    const patch = (data: Record<string, unknown>) =>
      page.request.patch(`${BASE}/api/news/${doc.id}?depth=0`, { data })

    try {
      // The draft is a 404, and getNewsBySlug caches that null
      expect((await h1(page, `/news/${slug}`)).status).toBe(404)
      expect((await h1(page, `/news/${slug}`)).status).toBe(404)

      expect((await patch({ _status: 'published' })).ok()).toBe(true)
      expect(await h1(page, `/news/${slug}`)).toEqual({ status: 200, title })

      // «Снять с публикации» in the admin: `_status: draft` without the draft query
      expect((await patch({ _status: 'draft' })).ok()).toBe(true)
      expect((await h1(page, `/news/${slug}`)).status).toBe(404)
    } finally {
      expect((await page.request.delete(`${BASE}/api/news/${doc.id}`)).ok()).toBe(true)
    }
  })
})

test.describe('POST /revalidate', () => {
  test('only POST with the secret', async ({ request }) => {
    const url = `${BASE}/revalidate`
    expect((await request.get(url)).status()).toBe(405)
    expect((await request.post(url)).status()).toBe(401)
    const wrong = await request.post(url, { headers: { authorization: 'Bearer wrong' } })
    expect(wrong.status()).toBe(401)
    expect(await wrong.text()).toBe('')

    const ok = await request.post(url, {
      headers: { authorization: `Bearer ${E2E_REVALIDATE_SECRET}` },
    })
    expect(ok.status()).toBe(200)
    expect((await ok.json()).revalidated).toBeGreaterThan(0)
  })
})
