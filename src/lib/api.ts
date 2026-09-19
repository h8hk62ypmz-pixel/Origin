import { INSTRUCTORS, generateOpenSlots } from '../data/catalogue'
import type { Booking, CreateBookingPayload, LessonSlot } from '../types'

const SLOTS_KEY = 'drivesa.slots'
const BOOKINGS_KEY = 'drivesa.bookings'

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
    const res = await fetch(path, init)
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
