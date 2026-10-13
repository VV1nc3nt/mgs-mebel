import { describe, expect, it } from 'vitest'

import { isAllowedEmbedUrl, toEmbed, withAutoplay } from '@/lib/embed'

const RT = '1480655fcab995b927db77bdd9d83986'
const RT_PLAYER = `https://rutube.ru/play/embed/${RT}/`
const VK_PLAYER = 'https://vk.ru/video_ext.php?oid=-71537209&id=456239752'

describe('toEmbed: RuTube', () => {
  it.each([
    [`https://rutube.ru/video/${RT}/`, RT_PLAYER],
    [`https://rutube.ru/video/${RT}`, RT_PLAYER],
    [`https://www.rutube.ru/video/${RT}/?r=wd`, RT_PLAYER],
    [`https://rutube.ru/shorts/${RT}/`, RT_PLAYER],
    [`https://rutube.ru/play/embed/${RT}`, RT_PLAYER],
    [`https://rutube.ru/play/embed/${RT.toUpperCase()}/`, RT_PLAYER],
    [`https://rutube.ru/video/private/${RT}/?p=Ab-12_cd`, `${RT_PLAYER}?p=Ab-12_cd`],
    [`https://rutube.ru/play/embed/${RT}/?p=Ab-12_cd`, `${RT_PLAYER}?p=Ab-12_cd`],
    [`  https://rutube.ru/video/${RT}/  `, RT_PLAYER],
  ])('%s', (link, src) => {
    expect(toEmbed(link)).toEqual({ src, host: 'rutube' })
  })

  it.each([
    'https://rutube.ru/channel/23704195/',
    'https://rutube.ru/video/abc/',
    `https://rutube.ru/plst/${RT}/`,
    `http://rutube.ru/video/${RT}/`,
    `https://rutube.ru.example.com/video/${RT}/`,
  ])('no player: %s', (link) => {
    expect(toEmbed(link)).toBeNull()
  })
})

describe('toEmbed: VK Video', () => {
  it.each([
    ['https://vkvideo.ru/video-71537209_456239752', VK_PLAYER],
    ['https://vk.com/video-71537209_456239752', VK_PLAYER],
    ['https://vk.ru/video-71537209_456239752', VK_PLAYER],
    ['https://m.vk.com/video-71537209_456239752?list=abc', VK_PLAYER],
    ['https://www.vk.com/video-71537209_456239752/', VK_PLAYER],
    ['https://vk.com/clip-71537209_456239752', VK_PLAYER],
    ['https://vk.com/mgsmebel?z=video-71537209_456239752%2Fpl_wall_-71537209', VK_PLAYER],
    ['https://vk.com/video?z=video-71537209_456239752', VK_PLAYER],
    ['https://vkvideo.ru/video12345_678', 'https://vk.ru/video_ext.php?oid=12345&id=678'],
    ['https://vk.com/video_ext.php?oid=-71537209&id=456239752&hd=2', VK_PLAYER],
    [
      'https://vk.ru/video_ext.php?oid=-71537209&id=456239752&hash=0a1b2c3d4e5f',
      `${VK_PLAYER}&hash=0a1b2c3d4e5f`,
    ],
  ])('%s', (link, src) => {
    expect(toEmbed(link)).toEqual({ src, host: 'vk' })
  })

  it.each([
    'https://vk.com/mgsmebel',
    'https://vkvideo.ru/playlist/-71537209_1',
    'https://vk.com/video_ext.php?oid=abc&id=1',
    'https://vk.com/video_ext.php?oid=-1',
    'http://vk.com/video-71537209_456239752',
    'https://vk.me/video-71537209_456239752',
    'https://youtube.com/watch?v=abc',
    'not a link',
  ])('no player: %s', (link) => {
    expect(toEmbed(link)).toBeNull()
  })

  it('no link, no player', () => {
    expect(toEmbed(null)).toBeNull()
    expect(toEmbed('')).toBeNull()
  })
})

describe('withAutoplay', () => {
  it('RuTube autoplay=true, VK autoplay=1; keeps the other parameters', () => {
    expect(withAutoplay({ src: RT_PLAYER, host: 'rutube' })).toBe(`${RT_PLAYER}?autoplay=true`)
    expect(withAutoplay({ src: `${RT_PLAYER}?p=k`, host: 'rutube' })).toBe(
      `${RT_PLAYER}?p=k&autoplay=true`,
    )
    expect(withAutoplay({ src: VK_PLAYER, host: 'vk' })).toBe(`${VK_PLAYER}&autoplay=1`)
  })
})

describe('isAllowedEmbedUrl', () => {
  it.each([
    'https://rutube.ru/video/abc/',
    'https://www.rutube.ru/video/abc/',
    'https://vk.com/video-1_2',
    'https://m.vk.com/video-1_2',
    'https://vk.ru/video-1_2',
    'https://www.vk.ru/video-1_2',
    'https://vkvideo.ru/video-1_2',
    'https://m.vkvideo.ru/video-1_2',
  ])('allowed: %s', (link) => {
    expect(isAllowedEmbedUrl(link)).toBe(true)
  })

  it.each([
    'http://rutube.ru/video/abc/',
    'https://youtube.com/watch?v=1',
    'https://vk.me/video-1_2',
    'https://evil.vk.com/video-1_2',
    'rutube.ru/video/abc/',
  ])('refused: %s', (link) => {
    expect(isAllowedEmbedUrl(link)).toBe(false)
  })
})
