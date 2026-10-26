import { LegalPage, legalMetadata } from '@/components/legal/LegalPage'

export const generateMetadata = () => legalMetadata('offer')

export default function OfferPage() {
  return <LegalPage docKey="offer" />
}
