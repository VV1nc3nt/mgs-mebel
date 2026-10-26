import { LegalPage, legalMetadata } from '@/components/legal/LegalPage'

export const generateMetadata = () => legalMetadata('cookies')

export default function CookiesPage() {
  return <LegalPage docKey="cookies" />
}
