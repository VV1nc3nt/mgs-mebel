import { seoDescription, seoTitle } from '@/lib/seo'

export { seoDescription, seoTitle }

export const seoMeta = ({
  title,
  brand,
  description,
  image,
}: {
  title: string
  brand?: 'end' | 'start'
  description?: string | null
  image?: number
}) => ({ title: seoTitle(title, brand), description: seoDescription(description), image })
