type E2EProject = {
  title: string
  /** The minimal mp4 of the fixture as the background video. */
  video: boolean
  hidden?: boolean
}

/**
 * Projects of «Дизайнерам» in the e2e fixture, in this order: 4 visible and a hidden one between
 * them (3rd row) — it is neither shown nor counted, so the visible ones are numbered 01–04 and the
 * counter says «01 / 04». The 1st and 3rd visible have the video, the 2nd a poster only; the 3rd
 * visible has a long title.
 */
export const E2E_PROJECTS: readonly E2EProject[] = [
  { title: 'Кухня-гостиная, 42 м²', video: true },
  { title: 'Гардеробная, 14 м²', video: false },
  { title: 'E2E: скрытый проект', video: true, hidden: true },
  {
    title: 'Гостиная с ТВ-зоной, камином, библиотекой и зоной отдыха у панорамного окна, 64 м²',
    video: true,
  },
  { title: 'Кухня с островом, 28 м²', video: false },
]

/** The hidden project of the fixture. */
export const HIDDEN_PROJECT_TITLE = 'E2E: скрытый проект'

/**
 * Manager of «Сотрудничество»: a phone and two messengers (MAX empty) — two columns, Telegram
 * before WhatsApp (MESSENGER_ORDER).
 */
export const E2E_MANAGER = {
  name: 'Харламов Максим Игоревич',
  position: 'Руководитель развития',
  phone: '8 995 783-94-28',
  max: null,
  telegram: 'https://t.me/mgs_designers_e2e',
  whatsapp: 'https://wa.me/79957839428',
} as const

/** Title of a «Дизайнерам» hero draft (created and put back by the draft mode test). */
export const DESIGNERS_DRAFT_TITLE = 'E2E: черновик дизайнерам'
