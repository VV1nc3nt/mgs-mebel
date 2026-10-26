import { ARTICLE_COLUMN } from '@/components/article/articleStyles'
import { PosterImage } from '@/components/ui/PosterImage'
import { PosterPlayer } from '@/components/ui/PosterPlayer'
import { VIDEO_POSTER, type ArticleVideo as Video, type VideoShape } from '@/lib/article'
import { cn } from '@/lib/cn'

const WIDTH: Record<VideoShape, string> = {
  column: ARTICLE_COLUMN,
  wide: 'w-full',
  vertical: 'mx-auto w-full max-w-video-vertical',
}

/**
 * Video block of a news body (README §6.8): the poster with ▶ 76, played in place on a click — a
 * file with sound or the RuTube / VK player (PosterPlayer). 16:9 in the column, or across the
 * container when wide; vertical — 9:16, at most 420, centred. The caption goes under the block.
 */
export function ArticleVideo({ video }: { video: Video }) {
  const poster = VIDEO_POSTER[video.shape]
  return (
    <figure data-article-video="" className={cn('my-4 flex flex-col gap-2.5', WIDTH[video.shape])}>
      <PosterPlayer
        variant="article"
        poster={
          <PosterImage media={video.poster} sizes={poster.sizes} imageSize={poster.imageSize} />
        }
        file={video.file}
        embedUrl={video.embedUrl}
        caption={video.caption}
        duration={video.duration}
        className={cn(
          'rounded-media md:rounded-footer',
          video.shape === 'vertical' ? 'aspect-9/16' : 'aspect-video',
        )}
      />
      {video.caption && (
        <figcaption className="text-body-xs text-text-4">{video.caption}</figcaption>
      )}
    </figure>
  )
}
