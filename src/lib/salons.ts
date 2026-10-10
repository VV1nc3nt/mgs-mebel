import {
  focalPosition,
  imageSource,
  videoSource,
  type ImageSource,
  type VideoSource,
} from './media'
import type { SalonCardData } from './queries'

/** What the «Салоны» page island gets of a salon: no hours, order or whole media documents. */
export type SalonView = {
  id: number
  name: string
  address: string
  phone: string | null
  location: SalonCardData['location']
  poster: (ImageSource & { position: string }) | null
  video: VideoSource | null
}

export const toSalonView = (salon: SalonCardData): SalonView => {
  const poster = imageSource(salon.poster, 'card')
  return {
    id: salon.id,
    name: salon.name,
    address: salon.address,
    phone: salon.phone?.trim() || null,
    location: salon.location,
    poster: poster && { ...poster, position: focalPosition(salon.poster) },
    video: videoSource(salon.reviewVideo),
  }
}
