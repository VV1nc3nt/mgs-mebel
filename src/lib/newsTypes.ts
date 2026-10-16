/**
 * Types of news: the select of the collection and the tags on the site share this list.
 * Kept free of Payload imports, so client components and unit tests can use it.
 */
export const newsTypeOptions = [
  { label: 'Новость', value: 'news' },
  { label: 'Новинка', value: 'new' },
] as const

export type NewsType = (typeof newsTypeOptions)[number]['value']

export const newsTypeLabel = (value: string | null | undefined): string | undefined =>
  newsTypeOptions.find((option) => option.value === value)?.label
