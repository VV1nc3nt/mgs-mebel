/**
 * Catalog categories: the select in «Каталоги» and the labels on the site share this list.
 * Kept free of Payload imports, so client components and unit tests can use it. Labels are
 * capitalised for the admin; the site shows them in lowercase (CSS).
 */
export const catalogCategoryOptions = [
  { label: 'Кухни', value: 'kitchens' },
  { label: 'Гардеробные', value: 'wardrobes' },
  { label: 'Фасады', value: 'facades' },
  { label: 'Ванные', value: 'bathrooms' },
  { label: 'Столы и стулья', value: 'tables' },
] as const

export type CatalogCategory = (typeof catalogCategoryOptions)[number]['value']

export const catalogCategoryLabel = (value: string | null | undefined): string | undefined =>
  catalogCategoryOptions.find((option) => option.value === value)?.label
