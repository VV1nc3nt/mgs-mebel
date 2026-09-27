import configPromise from '@payload-config'
import { getPayload } from 'payload'

/** Payload Local API for Server Components: reads the database directly, no HTTP. */
export const getPayloadClient = () => getPayload({ config: configPromise })
