import type { News } from '../../src/payload-types'
import { E2E_EXTRA_NEWS } from './e2eNews'

type Block = NonNullable<News['body']>[number]

/**
 * The article of the news page checks: the body is put on a published news of the fixture that is
 * already counted by the news list (E2E_EXTRA_NEWS, type «новость», not one of the home slider),
 * so the tabs and counters of /news stay as they are. No lead.
 */
export const E2E_ARTICLE = E2E_EXTRA_NEWS[0]!

export const ARTICLE_TEXT = {
  intro: 'Тестовый абзац статьи: в нём есть',
  internal: 'ссылка на другую новость',
  between: 'и',
  external: 'ссылка на внешний сайт',
  outro: 'Последний абзац статьи.',
  heading: 'Подзаголовок статьи',
  list: ['Первый пункт списка', 'Второй пункт списка', 'Третий пункт списка'],
  quote: 'Цитата статьи для проверки карточки цитаты.',
  quoteAuthor: 'Автор цитаты',
  quoteNoAuthor: 'Цитата без автора.',
  caption: 'Подпись к одному фото',
  galleryCaption: 'Подпись слайдера фото',
  videoCaption: 'Подпись видео',
  embedCaption: 'Видео RuTube',
  duration: '1:24',
  embedDuration: '11:52',
} as const

/** The RuTube video of the article: the page link and the player it opens. */
export const RUTUBE_ID = '1480655fcab995b927db77bdd9d83986'
export const RUTUBE_URL = `https://rutube.ru/video/${RUTUBE_ID}/`

export const EXTERNAL_URL = 'https://example.org/mgs-e2e'

const text = (value: string) => ({
  type: 'text',
  text: value,
  format: 0,
  detail: 0,
  mode: 'normal',
  style: '',
  version: 1,
})

const paragraph = (children: unknown[]) => ({
  type: 'paragraph',
  format: '' as const,
  indent: 0,
  version: 1,
  direction: 'ltr' as const,
  textFormat: 0,
  textStyle: '',
  children,
})

const link = (fields: Record<string, unknown>, label: string) => ({
  type: 'link',
  version: 3,
  format: '' as const,
  indent: 0,
  direction: 'ltr' as const,
  fields,
  children: [text(label)],
})

const rich = (...paragraphs: ReturnType<typeof paragraph>[]) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: paragraphs,
  },
})

type ArticleMedia = {
  photo: number
  wide: number
  /** 2 photos: in view from tablet. */
  gallery: number[]
  /** 5 photos: a slider at every width. */
  longGallery: number[]
  video: number | null
}

/**
 * Body with every text block, an empty paragraph, one photo, a wide one, two sliders (2 photos
 * 4:5 with a caption; 5 photos 1:1) and videos: a file in the column, a vertical file without a
 * duration, a wide RuTube link.
 */
export const articleBody = (media: ArticleMedia, linkedNewsId: number): Block[] => [
  {
    blockType: 'paragraph',
    text: rich(
      paragraph([
        text(`${ARTICLE_TEXT.intro} `),
        link(
          { linkType: 'internal', newTab: false, doc: { relationTo: 'news', value: linkedNewsId } },
          ARTICLE_TEXT.internal,
        ),
        text(` ${ARTICLE_TEXT.between} `),
        link({ linkType: 'custom', newTab: true, url: EXTERNAL_URL }, ARTICLE_TEXT.external),
        text('.'),
      ]),
      // An extra Enter: renders nothing
      paragraph([]),
    ),
  } as Block,
  { blockType: 'heading', text: ARTICLE_TEXT.heading },
  { blockType: 'list', items: ARTICLE_TEXT.list.map((item) => ({ text: item })) },
  { blockType: 'quote', text: ARTICLE_TEXT.quote, author: ARTICLE_TEXT.quoteAuthor },
  { blockType: 'media', photos: [media.photo], caption: ARTICLE_TEXT.caption },
  { blockType: 'media', photos: [media.wide], wide: true },
  { blockType: 'media', photos: media.gallery, caption: ARTICLE_TEXT.galleryCaption },
  { blockType: 'media', photos: media.longGallery, ratio: '1x1' },
  ...(media.video
    ? [
        {
          blockType: 'video',
          file: media.video,
          poster: media.photo,
          caption: ARTICLE_TEXT.videoCaption,
          duration: ARTICLE_TEXT.duration,
        } as Block,
        { blockType: 'video', file: media.video, poster: media.wide, vertical: true } as Block,
      ]
    : []),
  {
    blockType: 'video',
    embedUrl: RUTUBE_URL,
    poster: media.wide,
    caption: ARTICLE_TEXT.embedCaption,
    duration: ARTICLE_TEXT.embedDuration,
    wide: true,
  } as Block,
  { blockType: 'quote', text: ARTICLE_TEXT.quoteNoAuthor },
  { blockType: 'paragraph', text: rich(paragraph([text(ARTICLE_TEXT.outro)])) } as Block,
]
