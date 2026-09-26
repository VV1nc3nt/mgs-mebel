import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Media } from '@/payload-types'

import { cleanup, createImage, getTestPayload, PREFIX } from './helpers'

let payload: Payload
let image: Media
let counter = 0

beforeAll(async () => {
  payload = await getTestPayload()
  image = await createImage(payload)
})

afterAll(async () => {
  await cleanup(payload)
})

const text = (value: string, format = 0) => ({
  type: 'text',
  text: value,
  format,
  detail: 0,
  mode: 'normal',
  style: '',
  version: 1,
})

const node = (type: string, children: unknown[], extra: Record<string, unknown> = {}) => ({
  type,
  children,
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
  ...extra,
})

const createWithParagraph = (children: unknown[]) =>
  payload.create({
    collection: 'news',
    data: {
      title: `${PREFIX} абзац ${++counter}`,
      slug: `${PREFIX}-paragraph-${counter}`,
      type: 'news',
      date: '2026-01-01',
      cover: image.id,
      _status: 'published',
      body: [
        {
          blockType: 'paragraph',
          text: { root: node('root', children) } as never,
        },
      ],
    },
  })

const storedParagraph = (doc: Awaited<ReturnType<typeof createWithParagraph>>) => {
  const block = doc.body?.[0]
  if (block?.blockType !== 'paragraph') throw new Error('no paragraph block')
  return block.text.root.children as Record<string, unknown>[]
}

describe('news paragraph editor', () => {
  it('rejects a heading inside a paragraph', async () => {
    await expect(
      createWithParagraph([node('heading', [text('Заголовок')], { tag: 'h2' })]),
    ).rejects.toThrow()
  })

  it('rejects a list inside a paragraph', async () => {
    await expect(
      createWithParagraph([
        node('list', [node('listitem', [text('Пункт')], { value: 1 })], {
          listType: 'bullet',
          start: 1,
          tag: 'ul',
        }),
      ]),
    ).rejects.toThrow()
  })

  it('accepts bold, italic and links', async () => {
    const doc = await createWithParagraph([
      node(
        'paragraph',
        [
          text('жирный ', 1),
          text('курсив ', 2),
          node('link', [text('ссылка')], {
            id: 'link-1',
            fields: { linkType: 'custom', url: 'https://mgsmebel.ru', newTab: false },
          }),
        ],
        { textFormat: 0, textStyle: '' },
      ),
    ])
    const [paragraph] = storedParagraph(doc)
    const children = paragraph.children as Record<string, unknown>[]
    expect(children.map((child) => child.type)).toEqual(['text', 'text', 'link'])
    // External links always open in a new tab.
    expect((children[2].fields as { newTab: boolean }).newTab).toBe(true)
  })
})
