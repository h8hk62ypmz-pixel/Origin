import { INSTRUCTORS, generateOpenSlots } from '@shared/catalogue'
import type {
  Booking,
  CreateBookingPayload,
  LessonPriceMap,
  LessonSlot,
} from '@shared/types'
import { LESSON_LABELS, LESSON_PRICES } from '@shared/types'
import { apiUrl } from './native'

const SLOTS_KEY = 'drivesa.slots'
const BOOKINGS_KEY = 'drivesa.bookings'
const PRICES_KEY = 'drivesa.prices'

function readSlots(): LessonSlot[] {
  try {
    const raw = localStorage.getItem(SLOTS_KEY)
    if (raw) return JSON.parse(raw) as LessonSlot[]
  } catch {
    /* ignore */
  }
  const slots = generateOpenSlots()
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots))
  return slots
}

function writeSlots(slots: LessonSlot[]) {
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots))
}

function readBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY)
    if (raw) return JSON.parse(raw) as Booking[]
  } catch {
    /* ignore */
  }
  return []
}

function writeBookings(bookings: Booking[]) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings))
}

async function tryApi<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(apiUrl(path), init)
    if (!res.ok) {
      if (res.status >= 500 || res.status === 404) return null
      const err = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(err.error || `Request failed (${res.status})`)
    }
    return (await res.json()) as T
  } catch (e) {
    if (e instanceof Error && e.message && !e.message.includes('Failed to fetch')) throw e
    return null
  }
}

export async function fetchSlots(instructorId?: string): Promise<LessonSlot[]> {
  const q = instructorId ? `?instructorId=${encodeURIComponent(instructorId)}` : ''
  const api = await tryApi<{ slots: LessonSlot[] }>(`/api/slots${q}`)
  if (api?.slots) return api.slots

  let slots = readSlots()
  if (instructorId) slots = slots.filter((s) => s.instructorId === instructorId)
  return slots
}

export async function createCheckout(slotId: string, email: string, studentName: string) {
  const api = await tryApi<{
    mode: string
    amountCents: number
    currency: string
    url?: string
    message?: string
  }>('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotId, email, studentName }),
  })

  if (api) return api

  const slot = readSlots().find((s) => s.id === slotId)
  if (!slot) throw new Error('Slot not found')
  return {
    mode: 'demo',
    amountCents: slot.priceCents,
    currency: 'aud',
    message: 'Local demo payment (API offline).',
  }
}

export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  const api = await tryApi<{ booking: Booking }>('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (api?.booking) return api.booking

  const slots = readSlots()
  const slot = slots.find((s) => s.id === payload.slotId)
  if (!slot) throw new Error('Slot not found')
  if (slot.booked) throw new Error('That time was just booked. Pick another slot.')

  slot.booked = true
  writeSlots(slots)

  const booking: Booking = {
    id: `local_${Date.now().toString(36)}`,
    slotId: slot.id,
    createdAt: new Date().toISOString(),
    studentName: payload.studentName.trim(),
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone.trim(),
    notes: payload.notes?.trim(),
    licence: { ...payload.licence, dataUrl: undefined },
    paymentStatus: payload.paymentMethod === 'demo' ? 'demo_paid' : 'paid',
    amountCents: slot.priceCents,
    lessonType: slot.lessonType,
    instructorId: slot.instructorId,
    start: slot.start,
    end: slot.end,
    suburb: slot.suburb,
  }

  // Keep licence preview in local storage for confirmation screen
  if (payload.licence.dataUrl) {
    sessionStorage.setItem(`licence:${booking.id}`, payload.licence.dataUrl)
  }

  const bookings = readBookings()
  bookings.unshift(booking)
  writeBookings(bookings)
  return booking
}

export async function fetchBookings(): Promise<Booking[]> {
  const api = await tryApi<{ bookings: Booking[] }>('/api/bookings')
  if (api?.bookings) return api.bookings
  return readBookings()
}

export function getInstructor(id: string) {
  return INSTRUCTORS.find((i) => i.id === id)
}

export function formatAud(cents: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

function readPrices(): LessonPriceMap {
  try {
    const raw = localStorage.getItem(PRICES_KEY)
    if (raw) return { ...LESSON_PRICES, ...(JSON.parse(raw) as LessonPriceMap) }
  } catch {
    /* ignore */
  }
  return { ...LESSON_PRICES }
}

function writePrices(prices: LessonPriceMap) {
  localStorage.setItem(PRICES_KEY, JSON.stringify(prices))
}

export async function fetchPrices(): Promise<{
  prices: LessonPriceMap
  labels: typeof LESSON_LABELS
}> {
  const api = await tryApi<{ prices: LessonPriceMap; labels: typeof LESSON_LABELS }>(
    '/api/admin/prices',
  )
  if (api?.prices) return { prices: api.prices, labels: api.labels ?? LESSON_LABELS }
  return { prices: readPrices(), labels: LESSON_LABELS }
}

export async function savePrices(
  pin: string,
  prices: LessonPriceMap,
  applyToOpenSlots = true,
): Promise<{ prices: LessonPriceMap; message: string; updatedOpenSlots?: number }> {
  try {
    const res = await fetch(apiUrl('/api/admin/prices'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Pin': pin,
      },
      body: JSON.stringify({ prices, applyToOpenSlots }),
    })
    const data = (await res.json()) as {
      prices?: LessonPriceMap
      message?: string
      updatedOpenSlots?: number
      error?: string
    }
    if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`)
    if (data.prices) writePrices(data.prices)
    return {
      prices: data.prices ?? prices,
      message: data.message ?? 'Prices saved.',
      updatedOpenSlots: data.updatedOpenSlots,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Save failed'
    if (msg.includes('PIN') || msg.includes('Invalid') || msg.includes('Save failed')) {
      throw e instanceof Error ? e : new Error(msg)
    }
    // API unreachable — demo local fallback with default PIN
    if (pin !== 'drivesa') throw new Error('Invalid admin PIN')

    writePrices(prices)
    const slots = readSlots()
    for (const slot of slots) {
      if (!slot.booked) slot.priceCents = prices[slot.lessonType]
    }
    writeSlots(slots)
    return {
      prices,
      message: 'Prices saved locally (API offline). Open slots updated for customers.',
      updatedOpenSlots: slots.filter((s) => !s.booked).length,
    }
  }
}

export async function updateSlotPrice(
  pin: string,
  slotId: string,
  priceCents: number,
): Promise<{ message: string }> {
  try {
    const res = await fetch(apiUrl('/api/admin/slots'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Pin': pin,
      },
      body: JSON.stringify({ slotId, priceCents }),
    })
    const data = (await res.json()) as { message?: string; error?: string }
    if (!res.ok) throw new Error(data.error || `Update failed (${res.status})`)

    const slots = readSlots()
    const local = slots.find((s) => s.id === slotId)
    if (local && !local.booked) {
      local.priceCents = priceCents
      writeSlots(slots)
    }
    return { message: data.message ?? 'Slot price updated.' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Update failed'
    if (
      msg.includes('PIN') ||
      msg.includes('booked') ||
      msg.includes('not found') ||
      msg.includes('Update failed')
    ) {
      throw e instanceof Error ? e : new Error(msg)
    }
    if (pin !== 'drivesa') throw new Error('Invalid admin PIN')

    const slots = readSlots()
    const slot = slots.find((s) => s.id === slotId)
    if (!slot) throw new Error('Slot not found')
    if (slot.booked) throw new Error('That lesson is already booked — price is locked.')
    slot.priceCents = priceCents
    writeSlots(slots)
    return { message: 'Customer will see this price when they book this time. (Saved locally.)' }
  }
}
