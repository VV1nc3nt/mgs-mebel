import { ArticleRichText } from '@/components/article/ArticleRichText'
import type { ArticleLinks } from '@/lib/article'
import type { NewsParagraphBlock } from '@/payload-types'

/** Paragraph block of a news body (Lexical: inline formatting and links only). */
export function ArticleParagraph({
  block,
  links,
}: {
  block: NewsParagraphBlock
  links?: ArticleLinks
}) {
  return <ArticleRichText data={block.text} links={links} />
}
