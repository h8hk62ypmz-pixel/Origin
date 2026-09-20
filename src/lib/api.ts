import { INSTRUCTORS, generateOpenSlots } from '@shared/catalogue'
import type {
  ApprovalStatus,
  Booking,
  BookingLesson,
  CreateBookingPayload,
  LessonPriceMap,
  LessonSlot,
  PaymentChoice,
} from '@shared/types'
import {
  LESSON_LABELS,
  LESSON_PRICES,
  calcPaymentAmounts,
  isSlotOpen,
  normalizeSlotStatus,
} from '@shared/types'
import { apiUrl } from './native'

const SLOTS_KEY = 'drivesa.slots'
const BOOKINGS_KEY = 'drivesa.bookings'
const PRICES_KEY = 'drivesa.prices'

function normalizeLocalSlots(slots: LessonSlot[]): LessonSlot[] {
  return slots.map((slot) => {
    const status = normalizeSlotStatus(slot)
    return { ...slot, status, booked: status !== 'open' }
  })
}

function readSlots(): LessonSlot[] {
  try {
    const raw = localStorage.getItem(SLOTS_KEY)
    if (raw) return normalizeLocalSlots(JSON.parse(raw) as LessonSlot[])
  } catch {
    /* ignore */
  }
  const slots = generateOpenSlots()
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots))
  return normalizeLocalSlots(slots)
}

function writeSlots(slots: LessonSlot[]) {
  localStorage.setItem(SLOTS_KEY, JSON.stringify(normalizeLocalSlots(slots)))
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
  if (api?.slots) return normalizeLocalSlots(api.slots)

  let slots = readSlots()
  if (instructorId) slots = slots.filter((s) => s.instructorId === instructorId)
  return slots
}

export async function createCheckout(
  slotIds: string[],
  email: string,
  studentName: string,
  paymentChoice: PaymentChoice,
) {
  const api = await tryApi<{
    mode: string
    amountCents: number
    totalCents?: number
    remainingCents?: number
    depositCents?: number
    paymentChoice?: PaymentChoice
    currency: string
    url?: string
    message?: string
    lessonCount?: number
  }>('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotIds, email, studentName, paymentChoice }),
  })

  if (api) return api

  const slots = readSlots().filter((s) => slotIds.includes(s.id))
  if (slots.length !== slotIds.length) throw new Error('Slot not found')
  const totalCents = slots.reduce((sum, s) => sum + s.priceCents, 0)
  const amounts = calcPaymentAmounts(totalCents, paymentChoice)
  return {
    mode: 'demo',
    amountCents: amounts.amountPaidCents,
    totalCents,
    remainingCents: amounts.remainingCents,
    depositCents: amounts.depositCents,
    paymentChoice,
    currency: 'aud',
    lessonCount: slots.length,
    message: 'Local demo payment (API offline). Admin approval still required.',
  }
}

export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  const api = await tryApi<{ booking: Booking }>('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (api?.booking) return api.booking

  const slotIds = [
    ...new Set(payload.slotIds?.length ? payload.slotIds : payload.slotId ? [payload.slotId] : []),
  ]
  const slots = readSlots()
  const selected = slotIds.map((id) => slots.find((s) => s.id === id))
  if (selected.some((s) => !s)) throw new Error('Slot not found')
  if (selected.some((s) => s && !isSlotOpen(s))) {
    throw new Error('One or more times are pending or booked. Pick open slots only.')
  }

  const paymentChoice: PaymentChoice =
    payload.paymentChoice === 'deposit' ? 'deposit' : 'full'
  const lessons: BookingLesson[] = selected.map((slot) => ({
    slotId: slot!.id,
    start: slot!.start,
    end: slot!.end,
    lessonType: slot!.lessonType,
    instructorId: slot!.instructorId,
    suburb: slot!.suburb,
    priceCents: slot!.priceCents,
  }))
  const totalCents = lessons.reduce((sum, l) => sum + l.priceCents, 0)
  const { amountPaidCents, remainingCents } = calcPaymentAmounts(totalCents, paymentChoice)
  const first = lessons[0]
  const id = `local_${Date.now().toString(36)}`

  for (const slot of slots) {
    if (slotIds.includes(slot.id)) {
      slot.status = 'pending'
      slot.booked = true
      slot.bookingId = id
    }
  }
  writeSlots(slots)

  const booking: Booking = {
    id,
    slotId: first.slotId,
    slotIds,
    lessons,
    createdAt: new Date().toISOString(),
    studentName: payload.studentName.trim(),
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone.trim(),
    notes: payload.notes?.trim(),
    meetupLocation: payload.meetupLocation?.trim() || undefined,
    licence: { ...payload.licence, dataUrl: undefined },
    paymentStatus: payload.paymentMethod === 'demo' ? 'demo_paid' : 'paid',
    paymentChoice,
    totalCents,
    amountPaidCents,
    remainingCents,
    approvalStatus: 'pending',
    amountCents: amountPaidCents,
    lessonType: first.lessonType,
    instructorId: first.instructorId,
    start: first.start,
    end: first.end,
    suburb: first.suburb,
  }

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

export async function reviewBooking(
  pin: string,
  bookingId: string,
  action: 'confirm' | 'reject',
): Promise<{ booking: Booking; message: string }> {
  try {
    const res = await fetch(apiUrl('/api/admin/bookings'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Pin': pin,
      },
      body: JSON.stringify({ bookingId, action }),
    })
    const data = (await res.json()) as {
      booking?: Booking
      message?: string
      error?: string
    }
    if (!res.ok) throw new Error(data.error || `Update failed (${res.status})`)
    return {
      booking: data.booking!,
      message: data.message ?? 'Updated.',
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Update failed'
    if (
      msg.includes('PIN') ||
      msg.includes('already') ||
      msg.includes('not found') ||
      msg.includes('Update failed')
    ) {
      throw e instanceof Error ? e : new Error(msg)
    }
    if (pin !== 'drivesa') throw new Error('Invalid admin PIN')

    const bookings = readBookings()
    const booking = bookings.find((b) => b.id === bookingId)
    if (!booking) throw new Error('Booking not found')
    if (booking.approvalStatus !== 'pending') {
      throw new Error(`Booking is already ${booking.approvalStatus}`)
    }

    const next: ApprovalStatus = action === 'confirm' ? 'confirmed' : 'rejected'
    booking.approvalStatus = next
    const slotIds = booking.slotIds?.length ? booking.slotIds : [booking.slotId]
    const slots = readSlots()
    for (const slot of slots) {
      if (!slotIds.includes(slot.id)) continue
      if (action === 'confirm') {
        slot.status = 'confirmed'
        slot.booked = true
        slot.bookingId = booking.id
      } else {
        slot.status = 'open'
        slot.booked = false
        slot.bookingId = undefined
      }
    }
    writeSlots(slots)
    writeBookings(bookings)
    return {
      booking,
      message:
        action === 'confirm'
          ? 'Lessons confirmed. The block is locked in for the customer. (Local.)'
          : 'Booking rejected. Those times are open again. (Local.)',
    }
  }
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
    if (pin !== 'drivesa') throw new Error('Invalid admin PIN')

    writePrices(prices)
    const slots = readSlots()
    for (const slot of slots) {
      if (isSlotOpen(slot)) slot.priceCents = prices[slot.lessonType]
    }
    writeSlots(slots)
    return {
      prices,
      message: 'Prices saved locally (API offline). Open slots updated for customers.',
      updatedOpenSlots: slots.filter((s) => isSlotOpen(s)).length,
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
    if (local && isSlotOpen(local)) {
      local.priceCents = priceCents
      writeSlots(slots)
    }
    return { message: data.message ?? 'Slot price updated.' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Update failed'
    if (
      msg.includes('PIN') ||
      msg.includes('booked') ||
      msg.includes('pending') ||
      msg.includes('not found') ||
      msg.includes('Update failed')
    ) {
      throw e instanceof Error ? e : new Error(msg)
    }
    if (pin !== 'drivesa') throw new Error('Invalid admin PIN')

    const slots = readSlots()
    const slot = slots.find((s) => s.id === slotId)
    if (!slot) throw new Error('Slot not found')
    if (!isSlotOpen(slot)) throw new Error('That lesson is pending or booked — price is locked.')
    slot.priceCents = priceCents
    writeSlots(slots)
    return { message: 'Customer will see this price when they book this time. (Saved locally.)' }
  }
}
