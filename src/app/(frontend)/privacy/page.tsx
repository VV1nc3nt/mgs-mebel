import { LegalPage, legalMetadata } from '@/components/legal/LegalPage'

export const generateMetadata = () => legalMetadata('privacy')

export default function PrivacyPage() {
  return <LegalPage docKey="privacy" />
}
