import { getStore } from '@netlify/blobs'
import type { Booking, LessonPriceMap, LessonSlot } from '../../../shared/types'
import { LESSON_PRICES, isSlotOpen, normalizeSlotStatus } from '../../../shared/types'
import { generateOpenSlots } from '../../../shared/catalogue'

const BOOKINGS_KEY = 'all-bookings'
const SLOTS_KEY = 'open-slots'
const PRICES_KEY = 'lesson-prices'

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

export async function loadPrices(): Promise<LessonPriceMap> {
  const store = bookingsStore()
  const data = (await store.get(PRICES_KEY, { type: 'json' })) as LessonPriceMap | null
  return { ...LESSON_PRICES, ...(data ?? {}) }
}

export async function savePrices(prices: LessonPriceMap): Promise<void> {
  await bookingsStore().setJSON(PRICES_KEY, prices)
}

export function normalizeSlots(slots: LessonSlot[]): LessonSlot[] {
  return slots.map((slot) => {
    const status = normalizeSlotStatus(slot)
    return {
      ...slot,
      status,
      booked: status !== 'open',
    }
  })
}

export async function loadSlots(): Promise<LessonSlot[]> {
  const store = bookingsStore()
  let slots = (await store.get(SLOTS_KEY, { type: 'json' })) as LessonSlot[] | null
  if (!slots || slots.length === 0) {
    const prices = await loadPrices()
    slots = generateOpenSlots(new Date(), prices)
    await store.setJSON(SLOTS_KEY, slots)
  }
  return normalizeSlots(slots)
}

export async function saveSlots(slots: LessonSlot[]): Promise<void> {
  await bookingsStore().setJSON(SLOTS_KEY, normalizeSlots(slots))
}

/** Reprice open slots from the lesson-type price map. Held/confirmed keep their price. */
export function applyPricesToOpenSlots(
  slots: LessonSlot[],
  prices: LessonPriceMap,
): LessonSlot[] {
  return slots.map((slot) =>
    isSlotOpen(slot) ? { ...slot, priceCents: prices[slot.lessonType] } : slot,
  )
}

export function adminPin(): string {
  return process.env.DRIVE_SA_ADMIN_PIN || 'drivesa'
}

export function requireAdmin(req: Request): Response | null {
  const pin =
    req.headers.get('x-admin-pin') ||
    new URL(req.url).searchParams.get('pin') ||
    ''
  if (pin !== adminPin()) {
    return json({ error: 'Invalid admin PIN' }, 401)
  }
  return null
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Pin',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
    },
  })
}

export function corsPreflight(): Response {
  return json({ ok: true })
}
