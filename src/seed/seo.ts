const BRAND = 'MGS MEBEL'
const TITLE_MAX = 60
const DESCRIPTION_MAX = 160

const squash = (value: string) => value.replace(/\s+/g, ' ').trim()

/** «{title} — MGS MEBEL» (or «MGS MEBEL — {title}»); the bare title if the full one is too long. */
export const seoTitle = (title: string, brand: 'end' | 'start' = 'end'): string => {
  const text = squash(title)
  const full = brand === 'end' ? `${text} — ${BRAND}` : `${BRAND} — ${text}`
  return full.length <= TITLE_MAX ? full : text
}

/** A sentence end this far in is a better cut than the last word. */
const MIN_SENTENCE_CUT = 80

/**
 * Text cut to at most 160 characters, without an ellipsis: at the last sentence end
 * if it is not too short, otherwise at the last word boundary.
 */
export const seoDescription = (text: string | null | undefined): string | undefined => {
  if (!text) return undefined
  const value = squash(text)
  if (value.length <= DESCRIPTION_MAX) return value
  const cut = value.slice(0, DESCRIPTION_MAX + 1)
  const sentenceEnd = Math.max(...['. ', '! ', '? '].map((mark) => cut.lastIndexOf(mark)))
  if (sentenceEnd + 1 >= MIN_SENTENCE_CUT) return value.slice(0, sentenceEnd + 1)
  const space = cut.lastIndexOf(' ')
  return value.slice(0, space > 0 ? space : DESCRIPTION_MAX).replace(/[\s,;:—–-]+$/, '')
}

export const seoMeta = ({
  title,
  brand,
  description,
  image,
}: {
  title: string
  brand?: 'end' | 'start'
  description?: string | null
  image?: number
}) => ({ title: seoTitle(title, brand), description: seoDescription(description), image })
