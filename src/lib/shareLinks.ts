/*
 * «Поделиться» of an article (README §6.8): links of the messengers' own share pages, built from
 * the article's absolute URL and title. MAX has no documented share page yet — its link comes
 * from a template the owner fills in the CMS (newsPage → «Статья: поделиться»).
 */

import { MESSENGER_ORDER, type Messenger, type MessengerKind } from './chrome'
import type { ShareData } from './share'

const enc = encodeURIComponent

export const telegramShareUrl = ({ url, title }: ShareData): string =>
  `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`

export const whatsappShareUrl = ({ url, title }: ShareData): string =>
  `https://wa.me/?text=${enc(`${title} ${url}`)}`

/** The placeholders of the MAX template: the article URL (required) and its title. */
export const MAX_URL = '{url}'
export const MAX_TEXT = '{text}'

const fill = (template: string, { url, title }: ShareData): string =>
  template.replaceAll(MAX_URL, enc(url)).replaceAll(MAX_TEXT, enc(title))

/**
 * The template of the MAX link: empty is fine (no MAX button); otherwise https://, with {url}, and
 * a valid URL once filled in. A message for the editor, or true.
 */
export function checkMaxTemplate(value: string | null | undefined): string | true {
  const template = value?.trim()
  if (!template) return true
  if (!template.includes(MAX_URL)) return `Шаблон должен содержать ${MAX_URL} — адрес статьи`
  try {
    const url = new URL(fill(template, { url: 'https://example.com/news/x', title: 'x' }))
    if (url.protocol !== 'https:') return 'Ссылка должна начинаться с https://'
  } catch {
    return 'Неверная ссылка'
  }
  return true
}

/** The MAX link from the template; no template, or not a valid one — null (no button). */
export function maxShareUrl(template: string | null | undefined, data: ShareData): string | null {
  const value = template?.trim()
  if (!value || checkMaxTemplate(value) !== true) return null
  return fill(value, data)
}

/** The share links of an article in MESSENGER_ORDER; MAX only with a valid template. */
export function articleShareLinks(
  data: ShareData,
  maxTemplate: string | null | undefined,
): Messenger[] {
  const links: Record<MessengerKind, string | null> = {
    max: maxShareUrl(maxTemplate, data),
    telegram: telegramShareUrl(data),
    whatsapp: whatsappShareUrl(data),
  }
  return MESSENGER_ORDER.flatMap((kind) => {
    const href = links[kind]
    return href ? [{ kind, href }] : []
  })
}
