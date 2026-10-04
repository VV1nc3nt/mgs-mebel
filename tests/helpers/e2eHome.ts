/** Title of the unpublished home draft from seedHome: never shown to visitors or anonymous API reads. */
export const HOME_DRAFT_TITLE = 'E2E: черновик Главной'

/** Title of a news draft newer than every published news: the home slider must not show it. */
export const NEWS_DRAFT_TITLE = 'E2E: черновик новости'

/** Published news in the fixture; the slider shows the latest three. */
export const E2E_NEWS_COUNT = 4

/** Slug of that draft: its page is a 404, also in draft mode. */
export const NEWS_DRAFT_SLUG = 'e2e-draft'

/**
 * Seed salons in the fixture, in this order: the one with the longest address comes first, so
 * the home card is checked at its tallest; the last one has no phone.
 */
export const E2E_SALONS = ['Пражская', 'ЖК Варшавская LIFE', 'Химки'] as const
