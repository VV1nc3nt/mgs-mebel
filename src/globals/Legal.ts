import {
  BoldFeature,
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  ItalicFeature,
  lexicalEditor,
  OrderedListFeature,
  ParagraphFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical'
import type { GlobalConfig } from 'payload'

import { titleField } from '@/fields/section'
import { allowedNodesOnly, INLINE_NODES, siteLinkFeature } from '@/fields/richText'
import { LEGAL_DOCS, type LegalKey } from '@/lib/legal'

import { pageGlobal } from './shared'

/** A legal text: paragraphs, H2 / H3 (the H1 is the title), lists, bold, italic and links. */
const legalEditor = lexicalEditor({
  features: () => [
    ParagraphFeature(),
    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
    UnorderedListFeature(),
    OrderedListFeature(),
    BoldFeature(),
    ItalicFeature(),
    FixedToolbarFeature(),
    InlineToolbarFeature(),
    siteLinkFeature(),
  ],
})

const validateLegalText = allowedNodesOnly(
  {
    ...INLINE_NODES,
    heading: ({ tag }) => tag === 'h2' || tag === 'h3',
    list: ({ listType }) => listType === 'bullet' || listType === 'number',
    listitem: () => true,
  },
  (foreign) =>
    `В документе допустимы абзацы, подзаголовки H2 / H3, списки и ссылки (найдено: ${foreign}).`,
)

/**
 * A legal document (privacy, cookies, offer): its own page global — publishing one document does
 * not publish the drafts of the others; Live Preview opens its page. Rich text here is an agreed
 * exception to «paragraphs in globals are textarea»: a legal text needs headings and lists.
 */
const legalGlobal = (key: LegalKey, label: string, interfaceName: string): GlobalConfig => ({
  ...pageGlobal(
    LEGAL_DOCS[key].slug,
    label,
    [
      {
        label: 'Документ',
        description: 'Страница появится на сайте после публикации заголовка и текста.',
        fields: [
          titleField(true),
          {
            name: 'body',
            type: 'richText',
            label: 'Текст',
            required: true,
            editor: legalEditor,
            validate: validateLegalText,
          },
        ],
      },
    ],
    { group: 'Документы', previewPath: LEGAL_DOCS[key].path },
  ),
  typescript: { interface: interfaceName },
})

export const LegalPrivacy = legalGlobal('privacy', 'Политика конфиденциальности', 'LegalPrivacy')
export const LegalCookies = legalGlobal('cookies', 'Политика cookies', 'LegalCookies')
export const LegalOffer = legalGlobal('offer', 'Оферта', 'LegalOffer')

export const legalGlobals = [LegalPrivacy, LegalCookies, LegalOffer]
