import type { CSSProperties } from 'react'

/** Inline CSS custom properties (`--i`, `--n`) for calc() in globals.css, typed for `style`. */
export const cssVars = (vars: Record<`--${string}`, string | number>): CSSProperties =>
  vars as CSSProperties
