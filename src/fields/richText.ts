import { LinkFeature } from '@payloadcms/richtext-lexical'
import type { FieldAffectingData, RichTextField } from 'payload'
import { richText as validateRichText } from 'payload/shared'

type LinkFields = { linkType?: 'custom' | 'internal' }

/** External links always open in a new tab (rendered with rel="noopener noreferrer"), internal ones never. */
const newTabByLinkType = (field: FieldAffectingData): FieldAffectingData =>
  field.name === 'newTab' && field.type === 'checkbox'
    ? {
        ...field,
        admin: { ...field.admin, hidden: true },
        hooks: {
          beforeChange: [({ siblingData }) => (siblingData as LinkFields)?.linkType === 'custom'],
        },
      }
    : field

/**
 * Links of a site text (news body, documents): internal ones to a news, a project or an item
 * (rendered by `linkHref`: only what visitors can see), external ones always in a new tab.
 */
export const siteLinkFeature = () =>
  LinkFeature({
    enabledCollections: ['news', 'projects', 'items'],
    fields: ({ defaultFields }) => defaultFields.map(newTabByLinkType),
  })

type LexicalNode = { type?: unknown; tag?: unknown; listType?: unknown; children?: unknown }

/** Whether a node of a type is allowed (a type missing from the map is not). */
export type AllowedNodes = Record<string, (node: LexicalNode) => boolean>

const any = () => true

/** Nodes of inline text: formatting, line breaks and links. */
export const INLINE_NODES: AllowedNodes = {
  root: any,
  paragraph: any,
  text: any,
  linebreak: any,
  tab: any,
  link: any,
  autolink: any,
}

/** The first node not allowed: its type (with the tag or the list type when that is the reason). */
const findForeignNode = (node: unknown, allowed: AllowedNodes): string | undefined => {
  if (!node || typeof node !== 'object') return undefined
  const { type, tag, listType, children } = node as LexicalNode
  if (typeof type === 'string') {
    const check = allowed[type]
    if (!check) return type
    if (!check(node as LexicalNode)) return [type, tag ?? listType].filter(Boolean).join(' ')
  }
  return Array.isArray(children)
    ? children.map((child) => findForeignNode(child, allowed)).find(Boolean)
    : undefined
}

/**
 * The editor only hides other features; data sent through the API may still contain other
 * nodes. Refuse them on the server: `message` gets the type of the first foreign node.
 */
export const allowedNodesOnly =
  (allowed: AllowedNodes, message: (foreign: string) => string): RichTextField['validate'] =>
  async (value, args) => {
    const base = await validateRichText(value, args)
    if (base !== true) return base
    const foreign = findForeignNode((value as { root?: unknown } | null)?.root, allowed)
    return foreign ? message(foreign) : true
  }
