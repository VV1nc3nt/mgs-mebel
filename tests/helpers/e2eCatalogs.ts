import type { CatalogCategory } from '../../src/lib/catalogCategories'

type E2ECatalog = {
  title: string
  category: CatalogCategory
  pages: number | null
  /** A render with transparency instead of the booklet mockup. */
  render?: boolean
}

/**
 * Catalogs of the e2e fixture, in this order: 1 kitchen (каталог), 2 wardrobe (каталога) and
 * 5 facade catalogs (каталогов), 8 in all; bathrooms and tables have none, so their segments are
 * hidden. One without pages, one with a long title, one with a render.
 */
export const E2E_CATALOGS: readonly E2ECatalog[] = [
  { title: 'Кухни 2026', category: 'kitchens', pages: 96 },
  { title: 'Гардеробные системы', category: 'wardrobes', pages: 64 },
  { title: 'Шкафы-купе', category: 'wardrobes', pages: 52, render: true },
  { title: 'Фрезеровки «FACADE»', category: 'facades', pages: 48 },
  { title: 'Декоры ALVIC 2026', category: 'facades', pages: 72 },
  { title: 'Декоры без счёта страниц', category: 'facades', pages: null },
  {
    title: 'Фасады из массива, МДФ и шпона: полная коллекция фрезеровок и декоров',
    category: 'facades',
    pages: 21,
  },
  { title: 'Стеклянные фасады', category: 'facades', pages: 24 },
]

/** File name of a catalog's PDF in the fixture. */
export const catalogPdfFile = (index: number) => `e2e-catalog-${index + 1}.pdf`

/** Title of a «Каталоги» heading draft (created and removed by the draft mode test). */
export const CATALOGS_DRAFT_TITLE = 'E2E: черновик каталогов'
