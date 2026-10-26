import { ARTICLE_COLUMN } from '@/components/article/articleStyles'
import { MediaCard } from '@/components/ui/MediaCard'
import { COLUMN_PHOTO_SIZES, type ArticleFigure as Figure } from '@/lib/article'
import { cn } from '@/lib/cn'

/**
 * One photo of a news body: the text column, or the page container when wide; the ratio set by
 * the editor (3:2 by default, 16:9 wide). Below the first screen: lazy, no priority.
 */
export function ArticleFigure({ figure }: { figure: Figure }) {
  return (
    <figure
      data-article-figure=""
      className={cn('my-4 flex flex-col gap-2.5', figure.wide ? 'w-full' : ARTICLE_COLUMN)}
    >
      <MediaCard
        media={figure.photo}
        imageSize={figure.wide ? 'hero' : 'card'}
        sizes={figure.wide ? { base: '100vw' } : COLUMN_PHOTO_SIZES}
        ratio={figure.ratio}
      />
      {figure.caption && (
        <figcaption className="text-body-xs text-text-4">{figure.caption}</figcaption>
      )}
    </figure>
  )
}
