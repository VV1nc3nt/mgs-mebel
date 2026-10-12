/** Id of a page's first-screen marker; e2e looks it up too. */
export const FIRST_SCREEN_END_ID = 'first-screen-end'
/** Id of the marker after the header, put by AppShell on every page. */
export const HEADER_END_ID = 'header-end'

/**
 * Chromium does not paint the page until the HTML is parsed up to this marker, so a first frame
 * of a partly received document cannot show blocks that grow or move when the rest arrives.
 * AppShell puts one after the header (HEADER_END_ID) on every page; a page puts its own right
 * after the last block that can show on its first screen (at the tallest checked viewport).
 * With both, Chromium waits for both. React hoists the link into <head>. Safari and Firefox
 * ignore it and paint as before.
 *
 * The link and its target come together: a link whose target is missing would hold the first
 * paint until the whole document is parsed. One marker per id on a page.
 */
export function FirstScreenEnd({ id = FIRST_SCREEN_END_ID }: { id?: string }) {
  return (
    <>
      <link rel="expect" href={`#${id}`} blocking="render" />
      <div id={id} hidden />
    </>
  )
}
