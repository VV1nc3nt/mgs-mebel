/**
 * Project categories: the select in «Наши работы» and the labels on the site share this list.
 * Kept free of Payload imports, so client components and unit tests can use it.
 */
export const projectCategoryOptions = [
  { label: 'Комплекс', value: 'complex' },
  { label: 'Кухни', value: 'kitchens' },
  { label: 'Прихожие', value: 'hallways' },
  { label: 'Спальни', value: 'bedrooms' },
  { label: 'Санузлы', value: 'bathrooms' },
  { label: 'Гардеробные', value: 'wardrobes' },
  { label: 'Гостиные', value: 'livingrooms' },
] as const

export type ProjectCategory = (typeof projectCategoryOptions)[number]['value']

export const projectCategoryLabel = (value: string | null | undefined): string | undefined =>
  projectCategoryOptions.find((option) => option.value === value)?.label
