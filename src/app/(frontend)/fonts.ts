import localFont from 'next/font/local'

// Manrope variable (wght 200–800, v4.505), SIL OFL 1.1 (font-files/OFL.txt). Source: google/fonts
// @ b31870aff700ab7a1d74fa0c6887d95beb9e0037, ofl/manrope/Manrope[wght].ttf. One file, subset with
// fonttools to the Google Fonts cyrillic + latin ranges plus arrows and ₽:
//   pyftsubset 'Manrope[wght].ttf' --layout-features='*' --name-IDs='*' --flavor=woff2 \
//     --output-file=Manrope-Variable.woff2 --unicodes='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,\
//     U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,\
//     U+2215,U+FEFF,U+FFFD,U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116,U+2190-2193,U+20BD'
// Bundled so that the build never fetches Google Fonts.
// `display: 'optional'`, not `swap`: a woff2 that arrives after the first paint used to reflow
// the page (hero text block up to 40px on 390, the header nav/phone on 1440 — CLS flakes in e2e,
// #37). With `optional` the browser gives the font ~100ms before first paint and does not swap
// it in later: a late font keeps the adjusted Arial fallback for the rest of that document (new
// navigations re-check the cache) — accepted (owner, 08.10). LCP is the H1 text, not an image.
export const manrope = localFont({
  src: './font-files/Manrope-Variable.woff2',
  weight: '200 800',
  style: 'normal',
  variable: '--font-manrope',
  display: 'optional',
  preload: true,
  adjustFontFallback: 'Arial',
})
