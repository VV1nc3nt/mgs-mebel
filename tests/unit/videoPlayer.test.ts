import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { VideoBlock } from '@/blocks/news'
import { checkVideoSource, validateEmbedUrl, videoPlayerFields } from '@/fields/videoPlayer'

/** Data field names in order, rows flattened: the order of the admin and of the columns. */
const names = (fields: Field[]): string[] =>
  fields.flatMap((field) =>
    field.type === 'row' ? names(field.fields) : 'name' in field ? [field.name] : [],
  )

describe('videoPlayerFields', () => {
  it('news block: file, link, poster, duration with vertical / wide in one row, caption', () => {
    expect(names(VideoBlock.fields)).toEqual([
      'file',
      'embedUrl',
      'poster',
      'duration',
      'vertical',
      'wide',
      'caption',
    ])
    const row = VideoBlock.fields.find((field) => field.type === 'row')
    expect(row && names([row])).toEqual(['duration', 'vertical', 'wide'])
  })

  it('takes the name of the file field; the poster is required', () => {
    const fields = videoPlayerFields({ fileName: 'video', rule: 'notBoth' })
    expect(names(fields)).toEqual(['video', 'embedUrl', 'poster', 'duration', 'caption'])
    const poster = fields.find((field) => 'name' in field && field.name === 'poster')
    expect(poster && 'required' in poster && poster.required).toBe(true)
  })
})

describe('checkVideoSource', () => {
  const LINK = 'https://rutube.ru/video/abc/'

  it('exactlyOne: a file or a link, one of them', () => {
    expect(checkVideoSource('exactlyOne', 1, null)).toBe(true)
    expect(checkVideoSource('exactlyOne', null, LINK)).toBe(true)
    expect(checkVideoSource('exactlyOne', null, '')).toBe('Загрузите видео или укажите ссылку')
    expect(checkVideoSource('exactlyOne', 1, LINK)).toBe('Укажите что-то одно: файл или ссылку')
  })

  it('notBoth: neither is fine, both are not', () => {
    expect(checkVideoSource('notBoth', null, null)).toBe(true)
    expect(checkVideoSource('notBoth', 1, null)).toBe(true)
    expect(checkVideoSource('notBoth', null, LINK)).toBe(true)
    expect(checkVideoSource('notBoth', 1, LINK)).toBe('Укажите что-то одно: файл или ссылку')
  })
})

describe('validateEmbedUrl', () => {
  it('RuTube and VK Video over https only; empty is fine', () => {
    expect(validateEmbedUrl(null)).toBe(true)
    expect(validateEmbedUrl('https://rutube.ru/video/abc/')).toBe(true)
    expect(validateEmbedUrl('https://vkvideo.ru/video-1_2')).toBe(true)
    expect(validateEmbedUrl('https://www.youtube.com/watch?v=abc')).not.toBe(true)
    expect(validateEmbedUrl('http://rutube.ru/video/abc/')).not.toBe(true)
  })
})
