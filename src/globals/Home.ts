import { heroTab, historyTab, newsTab, salonsTab, worksTab } from './sections'
import { pageGlobal } from './shared'

export const Home = pageGlobal(
  'home',
  'Главная',
  [heroTab({ cta: true }), historyTab({ link: true }), newsTab(), salonsTab(), worksTab()],
  { previewPath: '/' },
)
