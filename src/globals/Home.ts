import { heroSlidesTab, newsTab, salonsTab, worksTab } from './sections'
import { pageGlobal } from './shared'

export const Home = pageGlobal(
  'home',
  'Главная',
  [heroSlidesTab(), newsTab(), salonsTab(), worksTab()],
  { previewPath: '/' },
)
