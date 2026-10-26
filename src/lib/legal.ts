import { hasText } from './article'

/** Legal documents of the site: the global of each one and the address of its page. */
export const LEGAL_DOCS = {
  privacy: { slug: 'legalPrivacy', path: '/privacy' },
  cookies: { slug: 'legalCookies', path: '/cookies' },
  offer: { slug: 'legalOffer', path: '/offer' },
} as const

export type LegalKey = keyof typeof LEGAL_DOCS
export type LegalSlug = (typeof LEGAL_DOCS)[LegalKey]['slug']

export const LEGAL_KEYS = Object.keys(LEGAL_DOCS) as LegalKey[]

/** What the site reads of a document global (the published version for visitors). */
export type LegalDocData = {
  title?: string | null
  body?: { root?: unknown } | null
}

/** A document has a page when it has a title and some text; otherwise its page answers 404. */
export const isLegalShown = (doc: LegalDocData | null | undefined): boolean =>
  !!doc?.title?.trim() && hasText(doc.body?.root)

export type LegalLink = { href: string; title: string }
export type LegalLinks = Partial<Record<LegalKey, LegalLink>>

/** Links to the pages of the documents that are shown (footer, cookie notice). */
export const legalLinks = (docs: Partial<Record<LegalKey, LegalDocData | null>>): LegalLinks => {
  const links: LegalLinks = {}
  for (const key of LEGAL_KEYS) {
    const doc = docs[key]
    if (doc && isLegalShown(doc))
      links[key] = { href: LEGAL_DOCS[key].path, title: doc.title!.trim() }
  }
  return links
}

// Nodes ending a run of text: their texts are not glued together
const BLOCK_NODES = new Set(['paragraph', 'heading', 'listitem', 'quote', 'linebreak', 'tab'])

/** Plain text of a Lexical document: the description of the page when SEO fields are empty. */
export const richTextPlain = (node: unknown): string => {
  const out: string[] = []
  const walk = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    const { type, text, children } = value as { type?: unknown; text?: unknown; children?: unknown }
    if (typeof text === 'string') out.push(text)
    if (Array.isArray(children)) children.forEach(walk)
    if (typeof type === 'string' && BLOCK_NODES.has(type)) out.push(' ')
  }
  walk(node)
  return out.join('').replace(/\s+/g, ' ').trim()
}
