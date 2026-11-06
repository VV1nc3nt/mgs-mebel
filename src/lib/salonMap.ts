import type { LngLat, YMapLocationRequest } from '@yandex/ymaps3-types'
import type { SalonPin } from './queries'

export type MapSalon = Pick<SalonPin, 'id' | 'name' | 'location'>

export function salonCoordinates(location: MapSalon['location'] | null): LngLat | null {
  const lat = location?.lat
  const lng = location?.lng
  return typeof lat === 'number' &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180
    ? [lng, lat]
    : null
}

export function salonMapLocation(points: LngLat[]): YMapLocationRequest {
  const xs = points.map(([lng]) => lng)
  const ys = points.map(([, lat]) => lat)
  const west = Math.min(...xs),
    east = Math.max(...xs)
  const south = Math.min(...ys),
    north = Math.max(...ys)
  return west === east && south === north
    ? { center: points[0], zoom: 12 }
    : {
        bounds: [
          [west, south],
          [east, north],
        ],
      }
}

export function salonMapHref(location: MapSalon['location'] | null): string | undefined {
  const point = salonCoordinates(location)
  if (!point) return undefined
  const query = new URLSearchParams({ ll: point.join(','), pt: point.join(','), z: '16' })
  return `https://yandex.ru/maps/?${query}`
}

/** Minimal translation needed to bring a marker into an unobscured rectangle. */
export function mapPanDelta(
  x: number,
  y: number,
  width: number,
  height: number,
  bottom: number,
  rightInset = 64,
): [number, number] {
  const left = 40,
    right = Math.max(left, width - rightInset)
  const top = 64,
    floor = Math.max(top, height - bottom)
  return [x - Math.min(right, Math.max(left, x)), y - Math.min(floor, Math.max(top, y))]
}
