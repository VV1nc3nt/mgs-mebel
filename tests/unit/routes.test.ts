import { describe, expect, it } from 'vitest'

import { isActive, isHeroRoute, NAV_ROUTES, NOT_FOUND_PATH, parentOf } from '@/lib/routes'

describe('routes', () => {
  it('lists sections in menu order (README §5.3)', () => {
    expect(NAV_ROUTES.map((r) => r.key)).toEqual([
      'about',
      'salons',
      'works',
      'catalogs',
      'designers',
      'news',
    ])
  })

  it('marks pages with a hero', () => {
    expect(['/', '/about', '/designers', '/about/'].map(isHeroRoute)).toEqual([
      true,
      true,
      true,
      true,
    ])
    expect(['/salons', '/works', '/catalogs', '/news', '/news/x'].some(isHeroRoute)).toBe(false)
  })

  it('keeps a section active on nested pages only', () => {
    expect(isActive('/news', '/news')).toBe(true)
    expect(isActive('/news/new-collection', '/news')).toBe(true)
    expect(isActive('/newsletter', '/news')).toBe(false)
    expect(isActive('/', '/about')).toBe(false)
  })

  it('points «←» to the parent section', () => {
    expect(parentOf('/')).toBeNull()
    expect(parentOf('/news/new-collection')).toEqual({
      href: '/news',
      label: 'Назад к новостям',
    })
    expect(parentOf('/news')).toEqual({ href: '/', label: 'На главную' })
    expect(parentOf('/salons')).toEqual({ href: '/', label: 'На главную' })
  })

  it('gives the global 404 a flow header, no active section and «←» home', () => {
    expect(isHeroRoute(NOT_FOUND_PATH)).toBe(false)
    expect(NAV_ROUTES.some((route) => isActive(NOT_FOUND_PATH, route.href))).toBe(false)
    expect(parentOf(NOT_FOUND_PATH)).toEqual({ href: '/', label: 'На главную' })
  })
})
