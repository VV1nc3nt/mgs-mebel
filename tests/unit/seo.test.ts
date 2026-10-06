import { afterEach, describe, expect, it, vi } from 'vitest'

import { breadcrumbJsonLd, organizationJsonLd, serializeJsonLd } from '@/lib/jsonld'
import { safePreviewPath } from '@/lib/preview'
import { buildMetadata, ogImage } from '@/lib/seo'
import { absoluteUrl, siteUrl } from '@/lib/site'
import { photo, video } from './fixtures'

vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/payload', () => ({ getPayloadClient: async () => ({}) }))

const og = { url: '/api/media/file/kitchen-1200x630.jpg', width: 1200, height: 630 }
const withOg = { ...photo, sizes: { ...photo.sizes, og } }

afterEach(() => vi.unstubAllEnvs())

describe('siteUrl', () => {
  it('prefers the run-time SITE_URL, then NEXT_PUBLIC_SITE_URL, then localhost', () => {
    vi.stubEnv('SITE_URL', 'https://mgs.example/')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://build.example')
    expect(siteUrl()).toBe('https://mgs.example')
    vi.stubEnv('SITE_URL', '')
    expect(siteUrl()).toBe('https://build.example')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    expect(siteUrl()).toBe('http://localhost:3000')
  })

  it('builds absolute URLs without a trailing slash', () => {
    vi.stubEnv('SITE_URL', 'https://mgs.example')
    expect(absoluteUrl('/')).toBe('https://mgs.example')
    expect(absoluteUrl('/news/x/')).toBe('https://mgs.example/news/x')
  })
})

describe('buildMetadata', () => {
  it('uses the SEO fields first, without doubling the brand', () => {
    vi.stubEnv('SITE_URL', 'https://mgs.example')
    const m = buildMetadata({
      meta: { title: 'Мы — MGS MEBEL', description: 'Описание из SEO', image: withOg },
      fallback: { title: 'H1', description: 'Лид', image: photo },
      path: '/',
    })
    expect(m.title).toEqual({ absolute: 'Мы — MGS MEBEL' })
    expect(m.description).toBe('Описание из SEO')
    expect(m.alternates?.canonical).toBe('https://mgs.example')
    expect(m.openGraph).toMatchObject({
      locale: 'ru_RU',
      type: 'website',
      siteName: 'MGS MEBEL',
      url: 'https://mgs.example',
      images: [{ url: `https://mgs.example${og.url}`, width: 1200, height: 630 }],
    })
    expect(m.twitter).toMatchObject({ card: 'summary_large_image' })
  })

  it('falls back to the content: title + brand, description cut to 160, the poster', () => {
    vi.stubEnv('SITE_URL', 'https://mgs.example')
    const long = `${'слово '.repeat(40)}конец.`
    const m = buildMetadata({
      meta: { title: '', description: null },
      fallback: { title: 'Наши  работы', description: long, image: photo },
      path: '/works/',
      type: 'article',
    })
    expect(m.title).toEqual({ absolute: 'Наши работы — MGS MEBEL' })
    expect((m.description as string).length).toBeLessThanOrEqual(160)
    expect(m.alternates?.canonical).toBe('https://mgs.example/works')
    // No og size: the largest generated size with its real dimensions
    expect(m.openGraph).toMatchObject({ type: 'article', images: [{ width: 1920, height: 1280 }] })
  })

  it('works with empty content: the brand only, no image', () => {
    const m = buildMetadata({ fallback: {}, path: '/' })
    expect(m.title).toEqual({ absolute: 'MGS MEBEL' })
    expect(m.description).toBeUndefined()
    expect(m.openGraph?.images).toBeUndefined()
    expect(m.twitter).toMatchObject({ card: 'summary' })
  })
})

describe('ogImage', () => {
  it('ignores videos and unpopulated ids', () => {
    expect(ogImage(video)).toBeUndefined()
    expect(ogImage(5)).toBeUndefined()
  })
})

describe('JSON-LD', () => {
  it('escapes < so CMS text cannot close the script tag', () => {
    const json = serializeJsonLd({ name: '</script><script>alert(1)</script>' })
    expect(json).not.toContain('<')
    expect(JSON.parse(json).name).toBe('</script><script>alert(1)</script>')
  })

  it('describes the organization with the contacts that are filled in', () => {
    vi.stubEnv('SITE_URL', 'https://mgs.example')
    expect(
      organizationJsonLd({ contacts: { hotlinePhone: '8 800 100-16-58', email: null } }),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'MGS MEBEL',
      url: 'https://mgs.example',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone: '8 800 100-16-58',
      },
    })
    expect(organizationJsonLd({})).not.toHaveProperty('contactPoint')
  })

  it('lists breadcrumbs from the home page with absolute URLs and positions from 1', () => {
    vi.stubEnv('SITE_URL', 'https://mgs.example')
    expect(
      breadcrumbJsonLd([
        { name: 'Главная', path: '/' },
        { name: 'О нас', path: '/about/' },
      ]),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://mgs.example' },
        { '@type': 'ListItem', position: 2, name: 'О нас', item: 'https://mgs.example/about' },
      ],
    })
  })
})

describe('safePreviewPath', () => {
  it.each([
    ['/', '/'],
    ['/news/vystavka?x=1#top', '/news/vystavka?x=1#top'],
  ])('keeps the own path %s', (raw, expected) => {
    expect(safePreviewPath(raw)).toBe(expected)
  })

  it.each([
    null,
    '',
    'news',
    '//evil.example',
    '/\\evil.example',
    'https://evil.example/',
    'javascript:alert(1)',
    '/admin',
    '/api/globals/home',
    '/preview?path=/',
  ])('sends %s home', (raw) => {
    expect(safePreviewPath(raw)).toBe('/')
  })
})
