/**
 * Legal documents of the e2e data: placeholder texts of the tests only (the seed has none — the
 * client's texts). Privacy and the offer are published, cookies stays empty (its page is a 404).
 */
export const E2E_LEGAL = {
  privacy: { title: 'E2E: политика конфиденциальности', path: '/privacy' },
  offer: { title: 'E2E: публичная оферта', path: '/offer' },
} as const

export const LEGAL_TEXT = {
  intro: 'Тестовый текст документа: начало, по которому строится описание страницы.',
  h2: 'Тестовый раздел документа',
  h3: 'Тестовый подраздел документа',
  bullets: ['Первый пункт маркированного списка', 'Второй пункт маркированного списка'],
  numbers: ['Первый пункт нумерованного списка', 'Второй пункт нумерованного списка'],
  linkBefore: 'В тексте есть',
  external: 'внешняя ссылка',
  internal: 'ссылка на новость',
  hidden: 'ссылка на черновик новости',
  outro: 'Последний абзац документа.',
  draft: 'E2E: черновик политики',
} as const

export const LEGAL_EXTERNAL_URL = 'https://example.org/mgs-e2e-legal'

const text = (value: string) => ({
  type: 'text',
  text: value,
  format: 0,
  detail: 0,
  mode: 'normal',
  style: '',
  version: 1,
})

const element = { format: '' as const, indent: 0, version: 1, direction: 'ltr' as const }

export const paragraph = (...children: unknown[]) => ({
  ...element,
  type: 'paragraph',
  textFormat: 0,
  textStyle: '',
  children: children.map((child) => (typeof child === 'string' ? text(child) : child)),
})

export const heading = (tag: 'h2' | 'h3' | 'h1' | 'h4', value: string) => ({
  ...element,
  type: 'heading',
  tag,
  children: [text(value)],
})

export const list = (listType: 'bullet' | 'number' | 'check', items: readonly string[]) => ({
  ...element,
  type: 'list',
  listType,
  start: 1,
  tag: listType === 'number' ? 'ol' : 'ul',
  children: items.map((value, i) => ({
    ...element,
    type: 'listitem',
    value: i + 1,
    children: [text(value)],
  })),
})

export const link = (fields: Record<string, unknown>, label: string) => ({
  ...element,
  type: 'link',
  version: 3,
  fields,
  children: [text(label)],
})

export const newsLink = (id: number, label: string) =>
  link({ linkType: 'internal', newTab: false, doc: { relationTo: 'news', value: id } }, label)

type LexicalNode = { type: string; version: number; [key: string]: unknown }

export const legalText = (...children: LexicalNode[]) => ({
  root: { ...element, type: 'root', children },
})

/**
 * Body of a published document: every kind of node, an external link, a link to a published news
 * and one to a news never published (its text without a link).
 */
export const legalBody = ({ newsId, draftNewsId }: { newsId: number; draftNewsId: number }) =>
  legalText(
    paragraph(LEGAL_TEXT.intro),
    heading('h2', LEGAL_TEXT.h2),
    list('bullet', LEGAL_TEXT.bullets),
    heading('h3', LEGAL_TEXT.h3),
    list('number', LEGAL_TEXT.numbers),
    paragraph(
      `${LEGAL_TEXT.linkBefore} `,
      link({ linkType: 'custom', newTab: true, url: LEGAL_EXTERNAL_URL }, LEGAL_TEXT.external),
      ', ',
      newsLink(newsId, LEGAL_TEXT.internal),
      ' и ',
      newsLink(draftNewsId, LEGAL_TEXT.hidden),
      '.',
    ),
    paragraph(LEGAL_TEXT.outro),
  )
