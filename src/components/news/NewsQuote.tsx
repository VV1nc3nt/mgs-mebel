import { ARTICLE_COLUMN } from '@/components/article/articleStyles'
import type { NewsQuoteBlock } from '@/payload-types'

/** Quote of a news body: a card with an accent mark; the author under it, if any. */
export function NewsQuote({ block }: { block: NewsQuoteBlock }) {
  const author = block.author?.trim()
  return (
    <figure className={`${ARTICLE_COLUMN} my-4 flex flex-col gap-4 rounded-media bg-surface-2 p-7`}>
      <span aria-hidden="true" className="text-quote-mark text-accent">
        “
      </span>
      <blockquote className="text-article-quote text-pretty">{block.text}</blockquote>
      {author && (
        <figcaption className="text-body-s font-semibold text-text-4">{author}</figcaption>
      )}
    </figure>
  )
}
