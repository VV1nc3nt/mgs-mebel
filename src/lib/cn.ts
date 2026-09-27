/** Joins truthy class names. Primitives accept `className` only for outer layout (margin, width). */
export const cn = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(' ')
