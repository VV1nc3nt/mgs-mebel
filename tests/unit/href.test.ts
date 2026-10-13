import { afterEach, describe, expect, it, vi } from 'vitest'

import { classifyHref } from '@/lib/href'

describe('classifyHref', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('own pages are internal (next/link)', () => {
    expect(classifyHref('/catalogs')).toEqual({ kind: 'internal', href: '/catalogs' })
    expect(classifyHref('/news/slug?x=1')).toEqual({ kind: 'internal', href: '/news/slug?x=1' })
    expect(classifyHref('#content')).toEqual({ kind: 'internal', href: '#content' })
    expect(classifyHref('/apiary')).toEqual({ kind: 'internal', href: '/apiary' })
  })

  it('files under /api are plain links: no next/link prefetch of a PDF', () => {
    expect(classifyHref('/api/media/file/a.pdf')).toEqual({
      kind: 'plain',
      href: '/api/media/file/a.pdf',
    })
    expect(classifyHref('/api')).toEqual({ kind: 'plain', href: '/api' })
  })

  it('absolute links to the own domain become paths; /api stays plain', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://mgs.example')
    expect(classifyHref('https://mgs.example/about')).toEqual({ kind: 'internal', href: '/about' })
    expect(classifyHref('https://mgs.example/api/media/file/a.pdf')).toEqual({
      kind: 'plain',
      href: '/api/media/file/a.pdf',
    })
  })

  it('other sites are external, other schemes plain', () => {
    expect(classifyHref('https://t.me/x')).toEqual({ kind: 'external', href: 'https://t.me/x' })
    expect(classifyHref('tel:88001001658')).toEqual({ kind: 'plain', href: 'tel:88001001658' })
  })
})
