import { getStore } from '@netlify/blobs'
import type { Booking, LessonSlot } from '../../src/types'
import { generateOpenSlots } from '../../src/data/catalogue'

const BOOKINGS_KEY = 'all-bookings'
const SLOTS_KEY = 'open-slots'

export function bookingsStore() {
  return getStore({ name: 'drivesa-bookings', consistency: 'strong' })
}

export function licencesStore() {
  return getStore({ name: 'drivesa-licences', consistency: 'strong' })
}

export async function loadBookings(): Promise<Booking[]> {
  const store = bookingsStore()
  const data = await store.get(BOOKINGS_KEY, { type: 'json' })
  return (data as Booking[] | null) ?? []
}

export async function saveBookings(bookings: Booking[]): Promise<void> {
  await bookingsStore().setJSON(BOOKINGS_KEY, bookings)
}

export async function loadSlots(): Promise<LessonSlot[]> {
  const store = bookingsStore()
  let slots = (await store.get(SLOTS_KEY, { type: 'json' })) as LessonSlot[] | null
  if (!slots || slots.length === 0) {
    slots = generateOpenSlots()
    await store.setJSON(SLOTS_KEY, slots)
  }
  return slots
}

export async function saveSlots(slots: LessonSlot[]): Promise<void> {
  await bookingsStore().setJSON(SLOTS_KEY, slots)
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  })
}

export function corsPreflight(): Response {
  return json({ ok: true })
}
