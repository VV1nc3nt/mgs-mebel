import type {
  SerializedAutoLinkNode,
  SerializedHeadingNode,
  SerializedLinkNode,
  SerializedListItemNode,
  SerializedListNode,
} from '@payloadcms/richtext-lexical'
import {
  RichText,
  type JSXConverterArgs,
  type JSXConvertersFunction,
} from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'

import { hasText, linkHref, type ArticleLinks, type LinkFields } from '@/lib/article'

import {
  ARTICLE_COLUMN,
  ARTICLE_H2,
  ARTICLE_H3,
  ARTICLE_ITEM,
  ARTICLE_LIST,
  ARTICLE_MARKER,
} from './articleStyles'

// Underlined: a link is told apart by more than its color (WCAG 1.4.1)
const LINK = 'underline underline-offset-2 transition-colors hover:text-accent'

type LinkNode = SerializedLinkNode | SerializedAutoLinkNode

// An item that only holds a nested list (Tab in the editor): no marker of its own
const isNestedOnly = (node: SerializedListItemNode) =>
  node.children.length > 0 && node.children.every((child) => child.type === 'list')

// Paragraphs carry the article type; an empty one (an extra Enter) renders nothing. Links: own
// pages through next/link, other sites in a new tab, a news not readable as published, an item or
// a project not visible — its text without a link. Headings and lists (legal documents; a news
// paragraph has none) — the same type as the heading and list blocks of a news.
const convertersFor =
  ({ items, projects }: ArticleLinks): JSXConvertersFunction =>
  ({ defaultConverters }) => {
    const link = ({ node, nodesToJSX }: JSXConverterArgs<LinkNode>) => {
      const children = nodesToJSX({ nodes: node.children })
      const target = linkHref(node.fields as LinkFields, items, projects)
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
    const heading = ({ node, nodesToJSX }: JSXConverterArgs<SerializedHeadingNode>) => {
      if (!hasText(node)) return null
      const children = nodesToJSX({ nodes: node.children })
      return node.tag === 'h3' ? (
        <h3 className={ARTICLE_H3}>{children}</h3>
      ) : (
        <h2 className={ARTICLE_H2}>{children}</h2>
      )
    }
    const list = ({ node, nodesToJSX }: JSXConverterArgs<SerializedListNode>) => {
      const children = nodesToJSX({ nodes: node.children })
      return node.listType === 'number' ? (
        <ol className={ARTICLE_LIST} start={node.start > 1 ? node.start : undefined}>
          {children}
        </ol>
      ) : (
        <ul className={ARTICLE_LIST}>{children}</ul>
      )
    }
    const listitem = ({ node, nodesToJSX, parent }: JSXConverterArgs<SerializedListItemNode>) => {
      const children = nodesToJSX({ nodes: node.children })
      if (isNestedOnly(node)) return <li className="flex flex-col gap-3 pl-6">{children}</li>
      const numbered = (parent as SerializedListNode | undefined)?.listType === 'number'
      return (
        <li className={ARTICLE_ITEM}>
          <span aria-hidden="true" className={ARTICLE_MARKER}>
            {numbered ? (
              <span className="font-bold text-accent tabular-nums">{node.value}.</span>
            ) : (
              <span className="size-2 rounded-full bg-accent" />
            )}
          </span>
          <span>{children}</span>
        </li>
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
      heading,
      list,
      listitem,
    }
  }

/**
 * Lexical text of an article: a paragraph block of a news (inline formatting and links), the body
 * of a legal document (also H2 / H3 and lists). The nodes go straight into the article body —
 * no container of their own. `links` — the visible items and projects the text links to.
 */
export function ArticleRichText({ data, links = {} }: { data: unknown; links?: ArticleLinks }) {
  return (
    <RichText
      data={data as never}
      converters={convertersFor(links)}
      disableContainer
      disableIndent
      disableTextAlign
    />
  )
}
