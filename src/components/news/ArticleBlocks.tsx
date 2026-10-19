import type { ArticleBlock } from '@/lib/article'

import { ArticleFigure } from './ArticleFigure'
import { ArticleGallery } from './ArticleGallery'
import { ArticleParagraph } from './ArticleParagraph'
import { ARTICLE_COLUMN } from './articleStyles'
import { ArticleVideo } from './ArticleVideo'
import { NewsQuote } from './NewsQuote'

const Block = ({ block }: { block: ArticleBlock }) => {
  switch (block.blockType) {
    case 'paragraph':
      return <ArticleParagraph block={block} />
    case 'heading':
      return <h2 className={`${ARTICLE_COLUMN} mt-4 text-article-h2 text-balance`}>{block.text}</h2>
    case 'list':
      return (
        <ul className={`${ARTICLE_COLUMN} flex flex-col gap-3`}>
          {block.items!.map((item, i) => (
            <li
              key={item.id ?? i}
              className="flex gap-3.5 text-article-item text-article xl:text-article-item-xl"
            >
              {/* One line high: the dot stays centred on the first line at every size */}
              <span aria-hidden="true" className="flex h-lh shrink-0 items-center">
                <span className="size-2 rounded-full bg-accent" />
              </span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      )
    case 'quote':
      return <NewsQuote block={block} />
    case 'figure':
      return <ArticleFigure figure={block} />
    case 'gallery':
      return <ArticleGallery gallery={block} />
    case 'video':
      return <ArticleVideo video={block} />
  }
}

/**
 * Body of a news article (README §6.8): the blocks in the editor's order, a 760 column with wide
 * photos and videos and the photo sliders across the container. Empty and unknown blocks are
 * already left out (articleBlocks).
 */
export function ArticleBlocks({ blocks }: { blocks: ArticleBlock[] }) {
  if (!blocks.length) return null
  return (
    <div className="page-container flex flex-col gap-6 pt-12 xl:pt-section-xl">
      {blocks.map((block, i) => (
        <Block key={block.id ?? i} block={block} />
      ))}
    </div>
  )
}
