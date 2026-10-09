import type { RequiredDataFromCollectionSlug } from 'payload'

import type { MediaId } from './types'

type Salon = RequiredDataFromCollectionSlug<'salons'>

const PHONE = '8-495-777-35-75'

/**
 * Salons page v2 (§6): four salons in their order. No coordinates and opening hours in the design
 * yet. Every optional field is set explicitly (null when empty): an update merges data, so a
 * missing key would keep the value of the previous seed (old coordinates, a removed video).
 */
export const salons = (id: MediaId): Salon[] => [
  {
    name: 'Пражская',
    address: 'Кировоградская, 15, ТЦ «Гранд Юг», 2 этаж',
    phone: PHONE,
    metro: 'Пражская',
    hours: null,
    location: { lat: null, lng: null },
    poster: id('P3'),
    reviewVideo: id('H11'),
    order: 1,
  },
  {
    name: 'Авиамоторная',
    address: 'Шоссе Энтузиастов, 12 к2, ТЦ «Город», 4 этаж',
    phone: PHONE,
    metro: null,
    hours: null,
    location: { lat: null, lng: null },
    poster: id('P4'),
    reviewVideo: id('H12'),
    order: 2,
  },
  {
    name: 'Химки',
    address: 'ул. Бутаково, 4, ТЦ «Гранд Химки», 2 этаж',
    phone: PHONE,
    metro: null,
    hours: null,
    location: { lat: null, lng: null },
    poster: id('P5'),
    reviewVideo: id('H13'),
    order: 3,
  },
  {
    name: 'Румянцево',
    address: 'Киевское шоссе, 22 км, блок В, вход 5, 3 этаж',
    phone: PHONE,
    metro: 'Румянцево',
    hours: null,
    location: { lat: null, lng: null },
    // No video: the card shows the photo only.
    poster: id('P6'),
    reviewVideo: null,
    order: 4,
  },
]

/** Salons of earlier seeds that are no longer in the demo: the seed deletes them. */
export const RETIRED_SALONS = ['ЖК Варшавская LIFE']

/** Stock files of earlier seeds that are no longer in the manifest: deleted when nothing uses them. */
export const RETIRED_FILES = ['mgs-seed-h7-bathroom.mp4']
