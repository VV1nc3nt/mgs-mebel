import { Manrope } from 'next/font/google'

export const manrope = Manrope({
  subsets: ['cyrillic', 'latin'],
  weight: ['300', '400', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})
