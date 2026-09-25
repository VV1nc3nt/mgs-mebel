import { labelField, leadField, titleField } from '@/fields/section'

import { pageGlobal } from './shared'

export const CatalogsPage = pageGlobal('catalogsPage', 'Каталоги', [
  { name: 'hero', label: 'Заголовок', fields: [labelField(), titleField(true), leadField()] },
])
