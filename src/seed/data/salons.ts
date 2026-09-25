import type { RequiredDataFromCollectionSlug } from 'payload'

import type { MediaId } from './types'

type Salon = RequiredDataFromCollectionSlug<'salons'>

const PHONE = '8-495-777-35-75'

/**
 * Salons page prototype. Coordinates were geocoded once from the addresses
 * (Nominatim / OpenStreetMap, 26.09.2026); Rumyantsevo and Khimki are approximate.
 */
export const salons = (id: MediaId): Salon[] => [
  {
    name: 'ЖК Варшавская LIFE',
    address: 'Москва, Котляковский пер., 2А к.3',
    phone: PHONE,
    location: { lat: 55.650212, lng: 37.631115 },
    order: 1,
  },
  {
    name: 'Пражская',
    address: 'ул. Кировоградская, 15, ТЦ «Гранд Юг», 2 этаж',
    phone: PHONE,
    metro: 'Пражская',
    location: { lat: 55.609624, lng: 37.60525 },
    reviewVideo: id('H6'),
    poster: id('U5'),
    order: 2,
  },
  {
    name: 'Румянцево',
    address: 'Киевское ш., 22-й км, 4с1, ТЦ «Румянцево»',
    phone: PHONE,
    metro: 'Румянцево',
    // Business park «Rumyantsevo»: the mall itself is not in OpenStreetMap.
    location: { lat: 55.636026, lng: 37.436536 },
    reviewVideo: id('H7'),
    poster: id('U10'),
    order: 3,
  },
  {
    name: 'Химки',
    address: 'Химки, шоу-рум MGS MEBEL',
    phone: PHONE,
    // City centre: the prototype has no street address.
    location: { lat: 55.891729, lng: 37.439699 },
    order: 4,
  },
]
