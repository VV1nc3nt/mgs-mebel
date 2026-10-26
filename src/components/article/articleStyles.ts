/** Text column of an article (README §6.8): 760, centred in the page container. */
export const ARTICLE_COLUMN = 'mx-auto w-full max-w-article'

/** Body of an article: its blocks one under another, below the heading or the cover. */
export const ARTICLE_BODY = 'page-container flex flex-col gap-6 pt-12 xl:pt-section-xl'

/** Subheading of an article text (H2); a legal document also has H3, a step smaller. */
export const ARTICLE_H2 = `${ARTICLE_COLUMN} mt-4 text-article-h2 text-balance`
export const ARTICLE_H3 = `${ARTICLE_COLUMN} mt-2 text-h3 text-balance`

/** List of an article: its items, the marker centred on the first line of each. */
export const ARTICLE_LIST = `${ARTICLE_COLUMN} flex flex-col gap-3`
export const ARTICLE_ITEM = 'flex gap-3.5 text-article-item text-article xl:text-article-item-xl'
/** One line high: the marker stays centred on the first line at every size. */
export const ARTICLE_MARKER = 'flex h-lh shrink-0 items-center'
