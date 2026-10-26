import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ArticleRichText } from '@/components/article/ArticleRichText'
import { isLegalShown, LEGAL_DOCS, legalLinks, richTextPlain } from '@/lib/legal'

import {
  heading,
  legalBody,
  LEGAL_EXTERNAL_URL,
  LEGAL_TEXT,
  legalText,
  link,
  list,
  paragraph,
} from '../helpers/e2eLegal'

const doc = (title: string | null, ...text: string[]) => ({
  title,
  body: legalText(...text.map((value) => paragraph(value))),
})

describe('legalLinks', () => {
  it('gives the address and the title of the documents with a title and a text', () => {
    expect(
      legalLinks({
        privacy: doc(' Политика конфиденциальности ', 'Текст'),
        cookies: doc('Политика cookies', '  ', ''),
        offer: doc('Оферта', 'Текст оферты'),
      }),
    ).toEqual({
      privacy: { href: '/privacy', title: 'Политика конфиденциальности' },
      offer: { href: '/offer', title: 'Оферта' },
    })
  })

  it('leaves out a document without a title, without a text or not read at all', () => {
    expect(
      legalLinks({ privacy: doc('  ', 'Текст'), cookies: null, offer: { title: 'Оферта' } }),
    ).toEqual({})
    // A fresh database: findGlobal gives `{}`
    expect(legalLinks({ privacy: {}, cookies: {}, offer: {} })).toEqual({})
    expect(legalLinks({})).toEqual({})
  })

  it('isLegalShown: a heading or a list item counts as text', () => {
    expect(isLegalShown({ title: 'Документ', body: legalText(heading('h2', 'Раздел')) })).toBe(true)
    expect(isLegalShown({ title: 'Документ', body: legalText(list('bullet', [' '])) })).toBe(false)
  })

  it('one path per document', () => {
    expect(Object.values(LEGAL_DOCS).map(({ path }) => path)).toEqual([
      '/privacy',
      '/cookies',
      '/offer',
    ])
  })
})

describe('richTextPlain', () => {
  it('joins the texts of the blocks with a space, links and formatting kept as text', () => {
    expect(
      richTextPlain(
        legalText(
          heading('h2', 'Раздел'),
          paragraph('Первый', link({ linkType: 'custom', url: 'https://a.ru' }, ' абзац')),
          list('number', ['пункт 1', 'пункт 2']),
        ).root,
      ),
    ).toBe('Раздел Первый абзац пункт 1 пункт 2')
    expect(richTextPlain(undefined)).toBe('')
  })
})

describe('ArticleRichText: a legal text', () => {
  const body = legalBody({ newsId: 1, draftNewsId: 2 })

  it('renders H2 / H3, bulleted and numbered lists with the article type', () => {
    const { container } = render(<ArticleRichText data={body} />)
    expect(screen.getByRole('heading', { level: 2, name: LEGAL_TEXT.h2 }).className).toContain(
      'text-article-h2',
    )
    expect(screen.getByRole('heading', { level: 3, name: LEGAL_TEXT.h3 }).className).toContain(
      'text-h3',
    )
    const [ul, ol] = [container.querySelector('ul'), container.querySelector('ol')]
    expect([...ul!.querySelectorAll('li')].map((li) => li.textContent)).toEqual(LEGAL_TEXT.bullets)
    // The number is a visual marker; the list itself is an <ol>
    expect([...ol!.querySelectorAll('li')].map((li) => li.textContent)).toEqual(
      LEGAL_TEXT.numbers.map((text, i) => `${i + 1}.${text}`),
    )
    expect(ol!.querySelector('[aria-hidden="true"]')?.textContent).toBe('1.')
    expect(container.querySelectorAll('p')).toHaveLength(2 + 1)
    expect(container.querySelector('p')?.className).toContain('text-article-body')
  })

  it('links: other sites in a new tab, a news not populated (not published) stays text', () => {
    render(<ArticleRichText data={body} />)
    const external = screen.getByRole('link', { name: LEGAL_TEXT.external })
    expect(external.getAttribute('href')).toBe(LEGAL_EXTERNAL_URL)
    expect(external.getAttribute('target')).toBe('_blank')
    expect(external.getAttribute('rel')).toBe('noopener noreferrer')
    // The fixture gives ids only, as the anonymous read of an unpublished news does
    expect(screen.queryByRole('link', { name: LEGAL_TEXT.internal })).toBeNull()
    expect(screen.getByText(LEGAL_TEXT.hidden, { exact: false })).toBeTruthy()
  })

  it('a nested list item has no marker of its own', () => {
    const nested = legalText({
      ...list('bullet', ['верхний']),
      children: [
        { ...list('bullet', ['верхний']).children[0]! },
        { type: 'listitem', version: 1, value: 2, children: [list('bullet', ['вложенный'])] },
      ],
    })
    const { container } = render(<ArticleRichText data={nested} />)
    const items = container.querySelectorAll('ul > li')
    expect(items).toHaveLength(3)
    expect(container.querySelectorAll('.bg-accent')).toHaveLength(2)
  })
})
