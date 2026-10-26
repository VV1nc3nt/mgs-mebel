import {
  ARTICLE_BODY,
  ARTICLE_H2,
  ARTICLE_ITEM,
  ARTICLE_LIST,
  ARTICLE_MARKER,
} from '@/components/article/articleStyles'
import type { ArticleBlock, ArticleLinks } from '@/lib/article'

import { ArticleFigure } from './ArticleFigure'
import { ArticleGallery } from './ArticleGallery'
import { ArticleParagraph } from './ArticleParagraph'
import { ArticleVideo } from './ArticleVideo'
import { NewsQuote } from './NewsQuote'

const Block = ({ block, links }: { block: ArticleBlock; links?: ArticleLinks }) => {
  switch (block.blockType) {
    case 'paragraph':
      return <ArticleParagraph block={block} links={links} />
    case 'heading':
      return <h2 className={ARTICLE_H2}>{block.text}</h2>
    case 'list':
      return (
        <ul className={ARTICLE_LIST}>
          {block.items!.map((item, i) => (
            <li key={item.id ?? i} className={ARTICLE_ITEM}>
              <span aria-hidden="true" className={ARTICLE_MARKER}>
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
 * already left out (articleBlocks). `links` — the visible items and projects the text links to.
 */
export function ArticleBlocks({ blocks, links }: { blocks: ArticleBlock[]; links?: ArticleLinks }) {
  if (!blocks.length) return null
  return (
    <div className={ARTICLE_BODY}>
      {blocks.map((block, i) => (
        <Block key={block.id ?? i} block={block} links={links} />
      ))}
    </div>
  )
}
