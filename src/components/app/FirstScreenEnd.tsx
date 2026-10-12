/** Id of the first-screen marker; e2e looks it up too. */
export const FIRST_SCREEN_END_ID = 'first-screen-end'

/**
 * Put on a page right after the last block that can show on its first screen (at the tallest
 * checked viewport). Chromium does not paint the page until the HTML is parsed up to here, so a
 * first frame of a partly received document cannot show blocks that grow or move when the rest
 * arrives. React hoists the link into <head>. Safari and Firefox ignore it and paint as before.
 *
 * The link and its target come together: a link whose target is missing would hold the first
 * paint until the whole document is parsed.
 */
export function FirstScreenEnd() {
  return (
    <>
      <link rel="expect" href={`#${FIRST_SCREEN_END_ID}`} blocking="render" />
      <div id={FIRST_SCREEN_END_ID} hidden />
    </>
  )
}
