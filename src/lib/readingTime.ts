import type { News } from '@/payload-types'

type Block = NonNullable<News['body']>[number]

const WORDS_PER_MINUTE = 180

const collectText = (node: unknown, out: string[]): void => {
  if (!node || typeof node !== 'object') return
  const { text, children } = node as { text?: unknown; children?: unknown }
  if (typeof text === 'string') out.push(text)
  if (Array.isArray(children)) children.forEach((child) => collectText(child, out))
}

const blockText = (block: Block): string[] => {
  switch (block.blockType) {
    case 'paragraph': {
      const out: string[] = []
      collectText(block.text?.root, out)
      return out
    }
    case 'heading':
      return [block.text]
    case 'list':
      return (block.items ?? []).map((item) => item.text)
    case 'quote':
      return [block.text, block.author ?? '']
    default:
      return []
  }
}

export const countWords = (text: string): number => text.split(/\s+/).filter(Boolean).length

/** Minutes to read the text blocks of a news body: words / 180, rounded up, at least 1. */
export const readingTime = (body: Block[] | null | undefined): number => {
  const words = (body ?? []).flatMap(blockText).reduce((sum, text) => sum + countWords(text), 0)
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}
