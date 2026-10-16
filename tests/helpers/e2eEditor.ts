/** Editor account of the e2e fixture (tests/helpers/seedChrome.ts): may preview drafts. */
export const e2eEditor = {
  email: 'e2e-editor@test.local',
  password: 'e2e-editor-password',
  role: 'content' as const,
}

/** Manager account of the e2e fixture: edits settings (messengers), not the pages. */
export const e2eManager = {
  email: 'e2e-manager@test.local',
  password: 'e2e-manager-password',
  role: 'manager' as const,
}
