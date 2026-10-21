import type { SerializedAutoLinkNode, SerializedLinkNode } from '@payloadcms/richtext-lexical'
import {
  RichText,
  type JSXConverterArgs,
  type JSXConvertersFunction,
} from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'

import { hasText, linkHref, type LinkFields, type VisibleItems } from '@/lib/article'
import type { NewsParagraphBlock } from '@/payload-types'
import { ARTICLE_COLUMN } from './articleStyles'

// Underlined: a link is told apart by more than its color (WCAG 1.4.1)
const LINK = 'underline underline-offset-2 transition-colors hover:text-accent'

type LinkNode = SerializedLinkNode | SerializedAutoLinkNode

// Paragraphs carry the article type; an empty one (an extra Enter) renders nothing. Links: own
// pages through next/link, other sites in a new tab, a news / project not readable as published or
// an item not visible — its text without a link.
const convertersFor =
  (items: VisibleItems | undefined): JSXConvertersFunction =>
  ({ defaultConverters }) => {
    const link = ({ node, nodesToJSX }: JSXConverterArgs<LinkNode>) => {
      const children = nodesToJSX({ nodes: node.children })
      const target = linkHref(node.fields as LinkFields, items)
      if (!target) return <>{children}</>
      if (target.kind === 'internal') {
        return (
          <Link href={target.href} className={LINK}>
            {children}
          </Link>
        )
      }
      return (
        <a
          href={target.href}
          className={LINK}
          {...(target.kind === 'external' && { target: '_blank', rel: 'noopener noreferrer' })}
        >
          {children}
        </a>
      )
    }
    return {
      ...defaultConverters,
      paragraph: ({ node, nodesToJSX }) =>
        hasText(node) ? (
          <p
            className={`${ARTICLE_COLUMN} text-article-body text-pretty text-article xl:text-article-body-xl`}
          >
            {nodesToJSX({ nodes: node.children })}
          </p>
        ) : null,
      link,
      autolink: link,
    }
  }

/** Paragraph block of a news body (Lexical: inline formatting and links only). */
export function ArticleParagraph({
  block,
  items,
}: {
  block: NewsParagraphBlock
  items?: VisibleItems
}) {
  return (
    <RichText
      data={block.text as never}
      converters={convertersFor(items)}
      disableContainer
      disableIndent
      disableTextAlign
    />
  )
}
